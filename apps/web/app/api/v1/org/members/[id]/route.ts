import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, notFound, forbidden, badRequest } from "@/lib/api-response";
import { mapOrganizationMember } from "@/lib/types";
import { getOrgRolePermissions, isOrgRole } from "@/lib/org-permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const actorId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "members:write")) {
    return forbidden("Insufficient permissions");
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("organization_members")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Member not found");

    const allowed: Record<string, unknown> = {};

    if (body.orgRole !== undefined) {
      if (!isOrgRole(body.orgRole)) return badRequest("INVALID_ROLE", "Invalid organization role");

      if (existing.org_role === "org_admin" && body.orgRole !== "org_admin") {
        const { count } = await supabaseAdmin()
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("welfare_group_id", org.welfareGroupId)
          .eq("org_role", "org_admin")
          .eq("is_active", true);

        if ((count ?? 0) <= 1) return forbidden("The organization must retain at least one active admin");
      }

      allowed.org_role = body.orgRole;
      allowed.permissions = getOrgRolePermissions(body.orgRole);
    }

    if (body.permissions !== undefined) {
      return forbidden("Permissions are derived from the organization role and cannot be set directly");
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return badRequest("INVALID_STATUS", "isActive must be a boolean");
      }
      if (existing.user_id === actorId && body.isActive === false) {
        return forbidden("You cannot deactivate your own organization membership");
      }

      if (body.isActive === false && existing.org_role === "org_admin") {
        const { count } = await supabaseAdmin()
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("welfare_group_id", org.welfareGroupId)
          .eq("org_role", "org_admin")
          .eq("is_active", true);

        if ((count ?? 0) <= 1) return forbidden("The organization must retain at least one active admin");
      }

      allowed.is_active = body.isActive;
    }

    if (Object.keys(allowed).length === 0) {
      return badRequest("NO_CHANGES", "No updatable fields provided");
    }

    const { data, error } = await supabaseAdmin()
      .from("organization_members")
      .update(allowed)
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapOrganizationMember(data), "Member updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const actorId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "members:write")) {
    return forbidden("Insufficient permissions");
  }

  const { id } = await params;

  try {
    const { data: target, error: targetError } = await supabaseAdmin()
      .from("organization_members")
      .select("user_id, org_role, is_active")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (targetError) return serverError(targetError.message);
    if (!target) return notFound("Member not found");
    if (target.user_id === actorId) return forbidden("Leave the organization through the membership workflow instead of deleting your own membership");

    if (target.org_role === "org_admin" && target.is_active) {
      const { count } = await supabaseAdmin()
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("welfare_group_id", org.welfareGroupId)
        .eq("org_role", "org_admin")
        .eq("is_active", true);

      if ((count ?? 0) <= 1) return forbidden("The organization must retain at least one active admin");
    }

    const { error } = await supabaseAdmin()
      .from("organization_members")
      .delete()
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId);

    if (error) return serverError(error.message);
    return ok(null, "Member removed");
  } catch {
    return serverError();
  }
}
