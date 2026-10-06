import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const userId = authResult.user.id;
    const admin = supabaseAdmin();

    const { data: memberRows, error: memberError } = await admin
      .from("organization_members")
      .select("welfare_group_id, org_role, is_active, welfare_org:welfare_orgs!organization_members_welfare_group_id_fkey(id, name, org_type, is_verified, is_active)")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (memberError) return serverError(memberError.message);

    const { data: adminRows } = await admin
      .from("welfare_org_admins")
      .select("welfare_group_id")
      .eq("user_id", userId);

    const adminOrgIds = new Set((adminRows ?? []).map((row) => row.welfare_group_id));

    const memberships = (memberRows ?? []).map((row: any) => ({
      orgId: row.welfare_group_id,
      orgRole: adminOrgIds.has(row.welfare_group_id) ? "org_admin" : row.org_role,
      isAdmin: adminOrgIds.has(row.welfare_group_id) || row.org_role === "org_admin",
      orgName: row.welfare_org?.name ?? "Organization",
      orgType: row.welfare_org?.org_type ?? "ngo",
      isVerified: row.welfare_org?.is_verified ?? false,
      isActive: row.welfare_org?.is_active ?? true,
    }));

    return ok({ memberships }, "Org memberships loaded");
  } catch {
    return serverError("Failed to load org memberships");
  }
}
