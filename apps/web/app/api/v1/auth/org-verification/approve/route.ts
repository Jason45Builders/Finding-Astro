import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError, forbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const ApproveVerificationSchema = z.object({
  verificationId: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  if (!["admin", "govt"].includes(authResult.user.role)) {
    return forbidden("Only admins and government officers can approve NGO verifications");
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`org-verification-approve:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({
      success: false,
      code: "RATE_LIMITED",
      message: `Too many requests. Retry after ${rate.retryAfter}s`,
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) },
    });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(ApproveVerificationSchema, raw);
    if (!parsed.ok) return parsed.response;

    const { verificationId, approved, notes } = parsed.data;
    const reviewerId = authResult.user.id;
    const newStatus = approved ? "approved" : "rejected";
    const admin = supabaseAdmin();

    const { data: verification, error: verificationError } = await admin
      .from("ngo_verifications")
      .select("id, user_id, requested_tier, org_name, org_type, address, welfare_org_id")
      .eq("id", verificationId)
      .maybeSingle();

    if (verificationError) return serverError(verificationError.message);
    if (!verification) return serverError("Verification request not found");

    const { error: statusError } = await admin
      .from("ngo_verifications")
      .update({
        status: newStatus,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes ?? null,
      })
      .eq("id", verificationId);

    if (statusError) return serverError(statusError.message);

    let welfareOrgId = verification.welfare_org_id as string | null;

    if (approved) {
      const tier = verification.requested_tier ?? 3;

      if (!welfareOrgId) {
        const { data: welfareOrg, error: orgError } = await admin
          .from("welfare_orgs")
          .insert({
            name: verification.org_name,
            org_type: verification.org_type ?? "ngo",
            address: verification.address ?? null,
            is_verified: true,
            is_active: true,
            payment_enabled: false,
            upi_verified: false,
          })
          .select("id")
          .single();

        if (orgError || !welfareOrg) return serverError(orgError?.message ?? "Failed to create organization");
        welfareOrgId = welfareOrg.id;

        await admin.from("ngo_verifications").update({ welfare_org_id: welfareOrgId }).eq("id", verificationId);
      } else {
        const { error: orgError } = await admin
          .from("welfare_orgs")
          .update({ is_verified: true, is_active: true })
          .eq("id", welfareOrgId);

        if (orgError) return serverError(orgError.message);
      }

      const { error: userError } = await admin
        .from("users")
        .update({ role: "ngo", identity_tier: tier })
        .eq("id", verification.user_id);

      if (userError) return serverError(userError.message);

      const { error: adminError } = await admin
        .from("welfare_org_admins")
        .upsert(
          { welfare_group_id: welfareOrgId, user_id: verification.user_id },
          { onConflict: "welfare_group_id,user_id" }
        );

      if (adminError) return serverError(adminError.message);

      const { error: memberError } = await admin
        .from("organization_members")
        .upsert(
          {
            welfare_group_id: welfareOrgId,
            user_id: verification.user_id,
            org_role: "org_admin",
            permissions: { "*": true },
            is_active: true,
          },
          { onConflict: "welfare_group_id,user_id" }
        );

      if (memberError) return serverError(memberError.message);
    } else if (welfareOrgId) {
      await admin
        .from("welfare_orgs")
        .update({ is_active: false, is_verified: false })
        .eq("id", welfareOrgId);

      await admin
        .from("organization_members")
        .update({ is_active: false })
        .eq("welfare_group_id", welfareOrgId)
        .eq("user_id", verification.user_id);
    }

    await audit({
      tableName: "ngo_verifications",
      recordId: verificationId,
      action: "UPDATE",
      actorId: reviewerId,
      actorRole: authResult.user.role,
      newData: {
        status: newStatus,
        user_id: verification.user_id,
        welfare_org_id: welfareOrgId,
      },
    });

    return ok({ welfareOrgId }, `Verification ${newStatus}`);
  } catch {
    return serverError("Failed to process verification");
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  if (!["admin", "govt"].includes(authResult.user.role)) {
    return forbidden("Only admins and government officers can view pending NGO verifications");
  }

  const { data, error } = await supabaseAdmin()
    .from("ngo_verifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Pending verifications loaded");
}
