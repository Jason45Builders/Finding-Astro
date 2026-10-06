import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { getOrgRolePermissions } from "@/lib/org-permissions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const CreateGroupSchema = z.object({
  name: z.string().trim().min(2).max(150),
  groupType: z.literal("rescue_collective"),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(255).optional(),
  website: z.string().trim().url().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const rate = await checkRateLimit(`org-group-create:${authResult.user.id}:${getClientIp(req)}`, req.headers.get("user-agent") ?? "unknown");
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), {
      status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) },
    });
  }

  try {
    const parsed = validateBody(CreateGroupSchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const admin = supabaseAdmin();

    const { data: group, error: groupError } = await admin.from("welfare_orgs").insert({
      name: body.name, org_type: "rescue_collective", address: body.address || null, city: body.city || null,
      phone: body.phone || null, email: body.email || null, website: body.website || null,
      is_verified: false, is_active: true,
    }).select("id, name, org_type, address, city, phone, email, website, is_verified, is_active, created_at, updated_at").single();

    if (groupError || !group) return serverError(groupError?.message ?? "Unable to create welfare group");

    const permissions = getOrgRolePermissions("org_admin");
    const { error: membershipError } = await admin.from("organization_members").insert({
      welfare_group_id: group.id, user_id: authResult.user.id, org_role: "org_admin", permissions, is_active: true,
    });

    if (membershipError) {
      await admin.from("welfare_orgs").delete().eq("id", group.id);
      return serverError(membershipError.message);
    }

    const { error: legacyAdminError } = await admin.from("welfare_org_admins").upsert({
      welfare_group_id: group.id, user_id: authResult.user.id,
    }, { onConflict: "welfare_group_id,user_id" });
    if (legacyAdminError) return serverError(legacyAdminError.message);

    return ok({ group, membership: { welfareGroupId: group.id, orgRole: "org_admin", permissions } }, "Rescue collective created");
  } catch {
    return serverError("Failed to create rescue collective");
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const requestedOrgId = new URL(req.url).searchParams.get("id");
  let query = supabaseAdmin().from("organization_members")
    .select("welfare_org:welfare_orgs!organization_members_welfare_group_id_fkey(id, name, org_type, address, city, phone, email, website, is_verified, is_active, created_at, updated_at)")
    .eq("user_id", authResult.user.id).eq("is_active", true);
  if (requestedOrgId) query = query.eq("welfare_group_id", requestedOrgId);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok((data ?? []).map((row: any) => row.welfare_org).filter(Boolean), "Welfare groups loaded");
}
