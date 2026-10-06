import { supabaseAdmin } from "./supabase-admin";
import { getOrgRolePermissions, hasOrgPermission as roleHasOrgPermission, isOrgRole, type OrgRole } from "./org-permissions";

export interface OrgContext {
  welfareGroupId: string;
  orgRole: OrgRole;
  permissions: Record<string, boolean>;
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function getOrgContext(userId: string, requestedOrgId?: string | null): Promise<OrgContext | null> {
  const admin = supabaseAdmin();

  const { data: memberships, error } = await admin
    .from("organization_members")
    .select("welfare_group_id, org_role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !memberships?.length) return null;

  const uniqueMemberships = memberships.filter((row, index, all) =>
    all.findIndex((candidate) => candidate.welfare_group_id === row.welfare_group_id) === index
  );

  let selected = requestedOrgId
    ? uniqueMemberships.find((row) => row.welfare_group_id === requestedOrgId)
    : uniqueMemberships.length === 1
      ? uniqueMemberships[0]
      : undefined;

  // Legacy welfare_org_admins records are accepted only when they also have an
  // active organization_members row. This removes the previous admin bypass.
  if (!selected) {
    const { data: adminRows } = await admin
      .from("welfare_org_admins")
      .select("welfare_group_id")
      .eq("user_id", userId);

    const adminOrgIds = new Set((adminRows ?? []).map((row) => row.welfare_group_id));
    const adminMemberships = uniqueMemberships.filter((row) => adminOrgIds.has(row.welfare_group_id));
    if (!requestedOrgId && adminMemberships.length === 1) selected = adminMemberships[0];
    if (requestedOrgId && adminMemberships.length) {
      selected = adminMemberships.find((row) => row.welfare_group_id === requestedOrgId);
    }
  }

  if (!selected || !isOrgRole(selected.org_role)) return null;

  const orgRole = selected.org_role;
  return {
    welfareGroupId: selected.welfare_group_id,
    orgRole,
    permissions: getOrgRolePermissions(orgRole),
  };
}

export function hasOrgPermission(permissions: Record<string, boolean>, permission: string): boolean {
  return permissions["*"] === true || permissions[permission] === true;
}

export function hasOrgRolePermission(orgRole: OrgRole, permission: string): boolean {
  return roleHasOrgPermission(orgRole, permission);
}

export async function requireOrg(req: { headers: Headers }): Promise<{ user: { id: string; role: string }; org: OrgContext } | Response> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError(401, "UNAUTHORIZED", "Authentication required");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { verifyToken } = await import("./jwt");

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return jsonError(401, "INVALID_TOKEN", "Invalid or expired token");
  }

  const admin = supabaseAdmin();
  const { data: userRow } = await admin
    .from("users")
    .select("role, is_banned, ban_reason")
    .eq("id", payload.sub)
    .single();

  if (!userRow) return jsonError(403, "ACCOUNT_NOT_FOUND", "Your account was not found. Please log in again.");
  if (userRow.is_banned) {
    return jsonError(403, "ACCOUNT_BANNED", `Your account has been suspended. Reason: ${userRow.ban_reason ?? "Violation of platform rules"}.`);
  }

  const requestedOrgId = req.headers.get("x-finding-astro-org-id");
  const org = await getOrgContext(payload.sub, requestedOrgId);

  if (!org) {
    if (!requestedOrgId) {
      const { count } = await admin
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", payload.sub)
        .eq("is_active", true);

      if ((count ?? 0) > 1) {
        return jsonError(409, "ORG_CONTEXT_REQUIRED", "Select an organization before using organization workspace features.");
      }
    }
    return jsonError(403, "NO_ORG", "No active organization membership found");
  }

  return { user: { id: payload.sub, role: userRow.role }, org };
}
