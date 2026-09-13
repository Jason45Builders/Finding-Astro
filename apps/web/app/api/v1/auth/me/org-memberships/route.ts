import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const userId = authResult.user.id;

    const { data: adminRows } = await supabaseAdmin()
      .from("welfare_org_admins")
      .select("welfare_group_id")
      .eq("user_id", userId);

    const { data: memberRows } = await supabaseAdmin()
      .from("organization_members")
      .select("welfare_group_id, org_role, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    const orgIds = new Set<string>();
    const memberships: Array<{ orgId: string; orgRole: string; isAdmin: boolean }> = [];

    for (const row of adminRows ?? []) {
      const gid = row.welfare_group_id;
      if (!orgIds.has(gid)) {
        orgIds.add(gid);
        memberships.push({ orgId: gid, orgRole: "org_admin", isAdmin: true });
      }
    }

    for (const row of memberRows ?? []) {
      const gid = row.welfare_group_id;
      if (!orgIds.has(gid)) {
        orgIds.add(gid);
        memberships.push({ orgId: gid, orgRole: row.org_role, isAdmin: false });
      }
    }

    return ok({ memberships }, "Org memberships loaded");
  } catch {
    return serverError("Failed to load org memberships");
  }
}
