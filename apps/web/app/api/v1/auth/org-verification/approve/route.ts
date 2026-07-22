import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const ApproveVerificationSchema = z.object({
  verificationId: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().optional(),
  requestedTier: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(ApproveVerificationSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { verificationId, approved, notes, requestedTier } = parsed.data;

    const newStatus = approved ? "approved" : "rejected";
    const reviewerId = authResult.user.id;

    const { error } = await supabaseAdmin()
      .from("ngo_verifications")
      .update({ status: newStatus, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes ?? null })
      .eq("id", verificationId);

    if (error) return serverError(error.message);

    const { data: verification } = await supabaseAdmin()
      .from("ngo_verifications")
      .select("user_id, requested_tier")
      .eq("id", verificationId)
      .single();

    if (approved && verification) {
      const tier = requestedTier ?? verification.requested_tier ?? 3;
      await supabaseAdmin().from("users").update({ role: "ngo", identity_tier: tier }).eq("id", verification.user_id);
    }

    await audit({ tableName: "ngo_verifications", recordId: verificationId, action: "UPDATE", actorId: reviewerId, actorRole: authResult.user.role, newData: { status: newStatus, user_id: verification?.user_id } });
    return ok(null, `Verification ${newStatus}`);
  } catch {
    return serverError("Failed to process verification");
  }
}
