import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
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
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const privileged = ["admin", "govt"];
  if (!privileged.includes(authResult.user.role)) {
    return forbidden("Only admins and government officers can approve NGO verifications");
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`org-verification-approve:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(ApproveVerificationSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { verificationId, approved, notes } = parsed.data;

    const newStatus = approved ? "approved" : "rejected";
    const reviewerId = authResult.user.id;

    const { error } = await supabaseAdmin()
      .from("ngo_verifications")
      .update({ status: newStatus, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes ?? null })
      .eq("id", verificationId);

    if (error) return serverError(error.message);

    const { data: verification } = await supabaseAdmin()
      .from("ngo_verifications")
      .select("user_id, requested_tier, org_name, org_type, address, welfare_org_id")
      .eq("id", verificationId)
      .single();

    if (approved && verification) {
      const tier = verification.requested_tier ?? 3;
      await supabaseAdmin().from("users").update({ role: "ngo", identity_tier: tier }).eq("id", verification.user_id);

      if (!verification.welfare_org_id) {
        const { data: welfareOrg, error: orgError } = await supabaseAdmin()
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

        if (!orgError && welfareOrg) {
          await supabaseAdmin().from("welfare_org_admins").insert({
            welfare_group_id: welfareOrg.id,
            user_id: verification.user_id,
          });
          await supabaseAdmin().from("ngo_verifications").update({ welfare_org_id: welfareOrg.id }).eq("id", verificationId);
        }
      }
    }

    await audit({ tableName: "ngo_verifications", recordId: verificationId, action: "UPDATE", actorId: reviewerId, actorRole: authResult.user.role, newData: { status: newStatus, user_id: verification?.user_id, welfare_org_id: verification?.welfare_org_id } });
    return ok(null, `Verification ${newStatus}`);
  } catch {
    return serverError("Failed to process verification");
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const privileged = ["admin", "govt"];
  if (!privileged.includes(authResult.user.role)) {
    return forbidden("Only admins and government officers can view pending verifications");
  }

  const { data, error } = await supabaseAdmin()
    .from("ngo_verifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Pending verifications loaded");
}
