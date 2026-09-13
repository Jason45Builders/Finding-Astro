import { supabaseAdmin } from "./supabase-admin";

export interface OrgContext {
  welfareGroupId: string;
  orgRole: string;
  permissions: Record<string, boolean>;
}

export async function getOrgContext(userId: string): Promise<OrgContext | null> {
  const admin = supabaseAdmin();

  const { data: adminRow } = await admin
    .from("welfare_org_admins")
    .select("welfare_group_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminRow) {
    const { data: memberRow } = await admin
      .from("organization_members")
      .select("org_role, permissions")
      .eq("welfare_group_id", adminRow.welfare_group_id)
      .eq("user_id", userId)
      .maybeSingle();

    return {
      welfareGroupId: adminRow.welfare_group_id,
      orgRole: (memberRow?.org_role as string) ?? "org_admin",
      permissions: (memberRow?.permissions as Record<string, boolean>) ?? {},
    };
  }

  const { data: memberRow } = await admin
    .from("organization_members")
    .select("welfare_group_id, org_role, permissions")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (memberRow) {
    return {
      welfareGroupId: memberRow.welfare_group_id,
      orgRole: memberRow.org_role as string,
      permissions: (memberRow.permissions as Record<string, boolean>) ?? {},
    };
  }

  return null;
}

export function hasOrgPermission(permissions: Record<string, boolean>, permission: string): boolean {
  if (permissions["*"]) return true;
  return !!permissions[permission];
}

export async function requireOrg(req: { headers: Headers }): Promise<{ user: { id: string; role: string }; org: OrgContext } | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ success: false, code: "UNAUTHORIZED", message: "Authentication required" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { verifyToken } = await import("./jwt");

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return new Response(JSON.stringify({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const admin = supabaseAdmin();
  const { data: userRow } = await admin
    .from("users")
    .select("role, is_banned")
    .eq("id", payload.sub)
    .single();

  if (!userRow || userRow.is_banned) {
    return new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "Account not found or banned" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  if (userRow.role !== "ngo" && userRow.role !== "govt" && userRow.role !== "admin") {
    return new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "Organization access required" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const org = await getOrgContext(payload.sub);
  if (!org) {
    return new Response(JSON.stringify({ success: false, code: "NO_ORG", message: "No organization membership found" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  return { user: { id: payload.sub, role: userRow.role }, org };
}