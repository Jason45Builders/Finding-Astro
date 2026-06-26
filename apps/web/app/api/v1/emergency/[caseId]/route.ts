import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

const ALLOWED_EMERGENCY_TRANSITIONS = ["claimed", "en_route", "on_scene", "picked_up", "at_hospital", "completed", "abandoned"];

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const caseId = parts[parts.length - 2];
    const action = parts[parts.length - 1];

    if (action === "claim") return handleClaim(req, caseId, authResult.user);
    if (action === "status") return handleStatusUpdate(req, caseId, authResult.user);
    if (action === "abandon") return handleAbandon(req, caseId, authResult.user);
    if (action === "response") return handleGetResponse(req, caseId, authResult.user);

    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}

async function handleClaim(req: NextRequest, caseId: string, user: { id: string; identityTier?: number }) {
  try {
    const userTier = user.identityTier ?? 0;
    if (userTier < 1) return new Response(JSON.stringify({ success: false, code: "IDENTITY_TIER_REQUIRED", message: "This action requires registered name identity verification. Please complete identity verification to access this feature." }), { status: 403, headers: { "Content-Type": "application/json" } });

    const { data: existing } = await supabaseAdmin.from("case_responses").select("*").eq("case_id", caseId).eq("status", "claimed").maybeSingle();
    if (existing) return badRequest("CONFLICT", "This case is already claimed");

    const { data, error } = await supabaseAdmin.from("case_responses").upsert({
      case_id: caseId,
      responder_user_id: user.id,
      status: "claimed",
      action_taken: null,
      notes: null,
      claimed_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(data, "Case claimed");
  } catch {
    return serverError();
  }
}

async function handleStatusUpdate(req: NextRequest, caseId: string, user: { id: string }) {
  try {
    const body = await req.json();
    const { status, notes } = body as { status?: string; notes?: string };
    if (!status || !ALLOWED_EMERGENCY_TRANSITIONS.includes(status)) return badRequest("VALIDATION_ERROR", "Invalid status");

    const { data: response } = await supabaseAdmin.from("case_responses").select("*").eq("case_id", caseId).eq("responder_user_id", user.id).maybeSingle();
    if (!response) return notFound("No active response found");

    const updatePayload: Record<string, unknown> = { status };
    if (notes) updatePayload.notes = notes;
    if (status === "completed") updatePayload.completed_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin.from("case_responses").update(updatePayload).eq("id", response.id).select("*").single();
    if (error) return serverError(error.message);

    // Update case status based on responder status
    if (status === "on_scene") {
      await supabaseAdmin.from("cases").update({ status: "action_taken", updated_at: new Date().toISOString() }).eq("id", caseId);
    }

    return ok(data, "Status updated");
  } catch {
    return serverError();
  }
}

async function handleAbandon(req: NextRequest, caseId: string, user: { id: string }) {
  try {
    const body = await req.json();
    const { reason } = body as { reason?: string };
    const { data, error } = await supabaseAdmin.from("case_responses").update({ status: "abandoned", notes: reason ?? "Responder abandoned", abandoned_at: new Date().toISOString() }).eq("case_id", caseId).eq("responder_user_id", user.id).select("*").single();
    if (error) return serverError(error.message);
    return ok(data, "Claim abandoned");
  } catch {
    return serverError();
  }
}

async function handleGetResponse(req: NextRequest, caseId: string, _user: { id: string }) {
  const { data, error } = await supabaseAdmin.from("case_responses").select("*").eq("case_id", caseId).order("claimed_at", { ascending: false }).limit(5);
  if (error) return serverError(error.message);
  return ok(data ?? [], "Response loaded");
}
