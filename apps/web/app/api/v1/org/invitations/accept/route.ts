import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError, badRequest } from "@/lib/api-response";
import { getOrgRolePermissions } from "@/lib/org-permissions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
    if (!token) return badRequest("INVALID_INVITATION", "Invitation token is required");

    const body = await req.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const admin = supabaseAdmin();

    const { data: invitation, error: invitationError } = await admin
      .from("organization_invitations")
      .select("id, welfare_group_id, invited_email, invited_user_id, org_role, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invitationError) return serverError(invitationError.message);
    if (!invitation) return badRequest("INVALID_INVITATION", "Invitation is invalid");
    if (invitation.status !== "pending") return badRequest("INVITATION_USED", "Invitation is no longer active");

    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      await admin.from("organization_invitations")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", invitation.id);
      return badRequest("INVITATION_EXPIRED", "Invitation has expired");
    }

    let userId = invitation.invited_user_id as string | null;

    if (!userId) {
      const { data: existingUser } = await admin
        .from("users")
        .select("id")
        .eq("email", invitation.invited_email)
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        if (password.length < 10) return badRequest("PASSWORD_REQUIRED", "Choose a password of at least 10 characters");
        const passwordHash = await bcrypt.hash(password, 12);
        const { data: createdUser, error: createError } = await admin
          .from("users")
          .insert({
            email: invitation.invited_email,
            password_hash: passwordHash,
            full_name: fullName || invitation.invited_email.split("@")[0],
            role: "citizen",
            is_active: true,
          })
          .select("id")
          .single();
        if (createError || !createdUser) return serverError(createError?.message ?? "Failed to create account");
        userId = createdUser.id;
      }
    }

    const { error: memberError } = await admin
      .from("organization_members")
      .upsert({
        welfare_group_id: invitation.welfare_group_id,
        user_id: userId,
        org_role: invitation.org_role,
        permissions: getOrgRolePermissions(invitation.org_role),
        is_active: true,
      }, { onConflict: "welfare_group_id,user_id" });

    if (memberError) return serverError(memberError.message);

    const { error: invitationUpdateError } = await admin
      .from("organization_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        invited_user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (invitationUpdateError) return serverError(invitationUpdateError.message);

    return ok({ userId, welfareGroupId: invitation.welfare_group_id, orgRole: invitation.org_role }, "Invitation accepted");
  } catch {
    return serverError();
  }
}
