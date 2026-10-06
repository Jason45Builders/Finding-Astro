import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, forbidden } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;
  const org = (authResult as { org: OrgContext }).org;
  if (!hasOrgPermission(org.permissions, "members:write")) return forbidden("Insufficient permissions");

  const { data, error } = await supabaseAdmin()
    .from("organization_invitations")
    .select("id, invited_email, invited_user_id, org_role, status, expires_at, accepted_at, revoked_at, created_at")
    .eq("welfare_group_id", org.welfareGroupId)
    .order("created_at", { ascending: false });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Invitations loaded");
}
