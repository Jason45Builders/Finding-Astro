import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, notFound, forbidden, badRequest } from "@/lib/api-response";
import { mapOrganizationMember } from "@/lib/types";

const ORG_ROLES = ["org_admin", "rescue_coordinator", "medical_coordinator", "adoption_coordinator", "finance", "volunteer", "vet", "foster"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

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
    if (body.orgRole && ORG_ROLES.includes(body.orgRole)) allowed.org_role = body.orgRole;
    if (body.permissions !== undefined) allowed.permissions = body.permissions;
    if (body.isActive !== undefined) allowed.is_active = body.isActive;

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("organization_members")
      .update(allowed)
      .eq("id", id)
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

  if (!hasOrgPermission(org.permissions, "members:write")) {
    return forbidden("Insufficient permissions");
  }

  const { id } = await params;

  try {
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