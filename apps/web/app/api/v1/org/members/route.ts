import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
      .select(`
        *,
        user:users!organization_members_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
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
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return badRequest("INVALID_BODY", "Email is required");

    const { data: userRow, error: userError } = await supabaseAdmin()
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let targetUserId = userRow?.id;
    let createdPassword: string | null = null;

    if (!targetUserId) {
      createdPassword = crypto.randomUUID().slice(0, 12);
      const passwordHash = await bcrypt.hash(createdPassword, 10);
      const { data: newUser, error: createError } = await supabaseAdmin()
        .from("users")
        .insert({
          email,
          password_hash: passwordHash,
          full_name: email.split("@")[0],
          role: "citizen",
          is_active: true,
        })
        .select("id")
        .single();

      if (createError || !newUser) {
        return serverError("Failed to create account for member");
      }
      targetUserId = newUser.id;
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
      .select(`
        *,
        user:users!organization_members_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) return serverError(error.message);

    const responsePayload: Record<string, unknown> = { member: mapOrganizationMember(data) };
    if (createdPassword) {
      responsePayload.tempPassword = createdPassword;
      responsePayload.message = "Account created. Share these credentials with the member.";
    }
    return ok(responsePayload, createdPassword ? "Member added with new account" : "Member added");
  } catch {
    return serverError();
  }
}