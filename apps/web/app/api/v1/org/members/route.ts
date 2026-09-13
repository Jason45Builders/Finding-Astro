import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden, notFound } from "@/lib/api-response";
import { mapOrganizationMember, mapUser } from "@/lib/types";

const ORG_ROLES = ["org_admin", "rescue_coordinator", "medical_coordinator", "adoption_coordinator", "finance", "volunteer", "vet", "foster"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const { data, error } = await supabaseAdmin()
      .from("organization_members")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);

    const members = (data ?? []).map(mapOrganizationMember);
    return ok(members, "Members loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "members:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const targetUserId = body.userId as string | undefined;
    if (!targetUserId) return badRequest("INVALID_BODY", "userId is required");

    const { data: userRow, error: userError } = await supabaseAdmin()
      .from("users")
      .select("id")
      .eq("id", targetUserId)
      .maybeSingle();

    if (userError || !userRow) {
      return badRequest("USER_NOT_FOUND", "The specified user does not exist");
    }

    const orgRole = body.orgRole && ORG_ROLES.includes(body.orgRole) ? body.orgRole : "volunteer";

    const { data, error } = await supabaseAdmin()
      .from("organization_members")
      .upsert({
        welfare_group_id: org.welfareGroupId,
        user_id: targetUserId,
        org_role: orgRole,
        permissions: body.permissions ?? {},
        is_active: true,
      }, { onConflict: "welfare_group_id,user_id" })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapOrganizationMember(data), "Member added");
  } catch {
    return serverError();
  }
}