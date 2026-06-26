import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { verificationId, approved, notes } = body as { verificationId: string; approved: boolean; notes?: string };
    if (!verificationId) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "verificationId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const newStatus = approved ? "approved" : "rejected";

    const { error } = await supabaseAdmin
      .from("ngo_verifications")
      .update({ status: newStatus, reviewed_by_user_id: authResult.user.id, reviewed_at: new Date().toISOString(), review_notes: notes ?? null })
      .eq("id", verificationId);

    if (error) return serverError(error.message);

    if (approved) {
      await supabaseAdmin.from("users").update({ role: "ngo", verified_ngo: true }).eq("id", verificationId);
    }

    return ok(null, `Verification ${newStatus}`);
  } catch {
    return serverError("Failed to process verification");
  }
}
