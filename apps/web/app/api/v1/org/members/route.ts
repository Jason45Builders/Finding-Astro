import { NextRequest } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden, notFound } from "@/lib/api-response";
import { mapOrganizationMember } from "@/lib/types";
import { getOrgRolePermissions, isOrgRole } from "@/lib/org-permissions";

const INVITATION_DAYS = 7;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;
  const org = (authResult as { org: OrgContext }).org;

  try {
    const { data, error } = await supabaseAdmin()
      .from("organization_members")
      .select(`*, user:users!organization_members_user_id_fkey (id, full_name, email)`)
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapOrganizationMember), "Members loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const inviterId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "members:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) return badRequest("INVALID_BODY", "A valid email is required");

    const orgRole = isOrgRole(body.orgRole) ? body.orgRole : "volunteer";
    const admin = supabaseAdmin();

    const { data: existingUser, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (userError) return serverError(userError.message);

    if (existingUser) {
      const { data: membership, error: membershipError } = await admin
        .from("organization_members")
        .select("id, is_active")
        .eq("welfare_group_id", org.welfareGroupId)
        .eq("user_id", existingUser.id)
        .maybeSingle();
      if (membershipError) return serverError(membershipError.message);
      if (membership?.is_active) return badRequest("ALREADY_MEMBER", "This user is already an active member of the organization");
    }

    const { data: pending } = await admin
      .from("organization_invitations")
      .select("id")
      .eq("welfare_group_id", org.welfareGroupId)
      .eq("invited_email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) return badRequest("INVITATION_PENDING", "A pending invitation already exists for this email");

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + INVITATION_DAYS * 86400000).toISOString();

    const { data: invitation, error } = await admin
      .from("organization_invitations")
      .insert({
        welfare_group_id: org.welfareGroupId,
        invited_email: email,
        invited_user_id: existingUser?.id ?? null,
        invited_by: inviterId,
        org_role: orgRole,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select("id, invited_email, org_role, status, expires_at, created_at")
      .single();

    if (error) return serverError(error.message);

    return ok({
      invitation,
      acceptToken: token,
      acceptPath: `/api/v1/org/invitations/accept?token=${encodeURIComponent(token)}`,
    }, "Invitation created");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;
  const org = (authResult as { org: OrgContext }).org;
  if (!hasOrgPermission(org.permissions, "members:write")) return forbidden("Insufficient permissions");

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("VALIDATION_ERROR", "Invitation id required");

  const { data, error } = await supabaseAdmin()
    .from("organization_invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("welfare_group_id", org.welfareGroupId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!data) return notFound("Pending invitation not found");
  return ok(null, "Invitation revoked");
}
