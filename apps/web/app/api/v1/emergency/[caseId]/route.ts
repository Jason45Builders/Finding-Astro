import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const ALLOWED_EMERGENCY_TRANSITIONS = ["claimed", "en_route", "on_scene", "picked_up", "at_hospital", "completed", "abandoned"];

const StatusUpdateSchema = z.object({
  status: z.enum(["claimed", "en_route", "on_scene", "picked_up", "at_hospital", "completed", "abandoned"]),
  notes: z.string().optional(),
});

const AbandonSchema = z.object({
  reason: z.string().optional(),
});

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

async function handleClaim(req: NextRequest, caseId: string, user: { id: string; role: string; identityTier?: number }) {
  try {
    const userTier = user.identityTier ?? 0;
    if (userTier < 1) return new Response(JSON.stringify({ success: false, code: "IDENTITY_TIER_REQUIRED", message: "This action requires registered name identity verification. Please complete identity verification to access this feature." }), { status: 403, headers: { "Content-Type": "application/json" } });

    const { data: existing } = await supabaseAdmin().from("case_responses").select("*").eq("case_id", caseId).eq("status", "claimed").maybeSingle();
    if (existing) return badRequest("CONFLICT", "This case is already claimed");

    const { data, error } = await supabaseAdmin().from("case_responses").upsert({
      case_id: caseId,
      responder_user_id: user.id,
      status: "claimed",
      action_taken: null,
      notes: null,
      claimed_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "case_responses", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
    return ok(data, "Case claimed");
  } catch {
    return serverError();
  }
}

async function handleStatusUpdate(req: NextRequest, caseId: string, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(StatusUpdateSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, notes } = parsed.data;
    const { data: response } = await supabaseAdmin().from("case_responses").select("*").eq("case_id", caseId).eq("responder_user_id", user.id).maybeSingle();
    if (!response) return notFound("No active response found");

    const updatePayload: Record<string, unknown> = { status };
    if (notes) updatePayload.notes = notes;
    if (status === "completed") updatePayload.completed_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin().from("case_responses").update(updatePayload).eq("id", response.id).select("*").single();
    if (error) return serverError(error.message);

    if (data) await audit({ tableName: "case_responses", recordId: response.id, action: "UPDATE", actorId: user.id, actorRole: user.role, oldData: response, newData: data });

    if (status === "on_scene") {
      await supabaseAdmin().from("cases").update({ status: "action_taken", updated_at: new Date().toISOString() }).eq("id", caseId);
    }

    return ok(data, "Status updated");
  } catch {
    return serverError();
  }
}

async function handleAbandon(req: NextRequest, caseId: string, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(AbandonSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { reason } = parsed.data;
    const { data, error } = await supabaseAdmin().from("case_responses").update({ status: "abandoned", notes: reason ?? "Responder abandoned", abandoned_at: new Date().toISOString() }).eq("case_id", caseId).eq("responder_user_id", user.id).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "case_responses", recordId: data.id, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
    return ok(data, "Claim abandoned");
  } catch {
    return serverError();
  }
}

async function handleGetResponse(req: NextRequest, caseId: string, _user: { id: string; role: string }) {
  const { data, error } = await supabaseAdmin().from("case_responses").select("*").eq("case_id", caseId).order("claimed_at", { ascending: false }).limit(5);
  if (error) return serverError(error.message);
  return ok(data ?? [], "Response loaded");
}
