import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const RESPONSE_DEADLINE_MINUTES = 15;

// Photo evidence per rescue stage - required for the stages where proof of
// what actually happened to the animal matters most (a picked-up, hospitalised,
// or completed rescue with no photo is not verifiable after the fact).
const PHOTO_COLUMN_BY_STATUS: Record<string, string> = {
  on_scene: "on_scene_photo_urls",
  picked_up: "picked_up_photo_urls",
  at_hospital: "at_hospital_photo_urls",
  completed: "completed_photo_urls",
};
const MANDATORY_PHOTO_STATUSES = new Set(["picked_up", "at_hospital", "completed"]);

function mapCaseResponse(row: Record<string, unknown>) {
  const responder = row.users as { full_name?: string | null } | null;
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    responderUserId: row.responder_user_id as string,
    responderName: responder?.full_name ?? null,
    status: row.status as string,
    notes: row.notes as string | null,
    onScenePhotoUrls: (row.on_scene_photo_urls as string[]) ?? [],
    pickedUpPhotoUrls: (row.picked_up_photo_urls as string[]) ?? [],
    atHospitalPhotoUrls: (row.at_hospital_photo_urls as string[]) ?? [],
    completedPhotoUrls: (row.completed_photo_urls as string[]) ?? [],
    createdAt: row.created_at as string,
  };
}

const StatusUpdateSchema = z.object({
  status: z.enum(["claimed", "en_route", "on_scene", "picked_up", "at_hospital", "completed", "abandoned"]),
  notes: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
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

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const caseId = parts[parts.length - 2];
    const action = parts[parts.length - 1];

    if (action === "status") return handleStatusUpdate(req, caseId, authResult.user);

    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  const caseId = parts[parts.length - 2];
  const action = parts[parts.length - 1];

  if (action === "response") return handleGetResponse(req, caseId, authResult.user);

  return new Response(null, { status: 405 });
}

async function handleClaim(req: NextRequest, caseId: string, user: { id: string; role: string; identityTier?: number }) {
  try {
    const userTier = user.identityTier ?? 0;
    if (userTier < 1) return new Response(JSON.stringify({ success: false, code: "IDENTITY_TIER_REQUIRED", message: "This action requires registered name identity verification. Please complete identity verification to access this feature." }), { status: 403, headers: { "Content-Type": "application/json" } });

    const { data: caseRecord } = await supabaseAdmin().from("cases").select("id, status").eq("id", caseId).maybeSingle();
    if (!caseRecord) return notFound("Case not found");
    if (caseRecord.status !== "open") return badRequest("CONFLICT", "This case is no longer open");

    const { data: existing } = await supabaseAdmin().from("case_responses").select("*").eq("case_id", caseId).eq("status", "claimed").maybeSingle();
    if (existing) return badRequest("CONFLICT", "This case is already claimed");

    const now = new Date();
    const deadline = new Date(now.getTime() + RESPONSE_DEADLINE_MINUTES * 60 * 1000);

    const { data, error } = await supabaseAdmin().from("case_responses").insert({
      case_id: caseId,
      responder_user_id: user.id,
      status: "claimed",
      notes: null,
      claimed_at: now.toISOString(),
      deadline_at: deadline.toISOString(),
    }).select("*, users!responder_user_id(full_name)").single();

    if (error) return serverError(error.message);

    await supabaseAdmin().from("cases").update({ status: "in_review", updated_at: now.toISOString() }).eq("id", caseId);
    await supabaseAdmin().from("case_events").insert({ case_id: caseId, actor_id: user.id, from_status: "open", to_status: "in_review", notes: "Claimed by responder" });
    if (data) await audit({ tableName: "case_responses", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
    return ok(mapCaseResponse(data), "Case claimed");
  } catch {
    return serverError();
  }
}

async function handleStatusUpdate(req: NextRequest, caseId: string, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(StatusUpdateSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, notes, evidenceUrls } = parsed.data;

    if (MANDATORY_PHOTO_STATUSES.has(status) && (!evidenceUrls || evidenceUrls.length === 0)) {
      return badRequest("PHOTO_REQUIRED", `Photo evidence is required to mark this case as "${status.replace(/_/g, " ")}"`);
    }

    const { data: response } = await supabaseAdmin().from("case_responses").select("*").eq("case_id", caseId).eq("responder_user_id", user.id).maybeSingle();
    if (!response) return notFound("No active response found");

    const updatePayload: Record<string, unknown> = { status };
    if (notes) updatePayload.notes = notes;
    if (status === "completed") updatePayload.completed_at = new Date().toISOString();
    const photoColumn = PHOTO_COLUMN_BY_STATUS[status];
    if (photoColumn && evidenceUrls && evidenceUrls.length > 0) updatePayload[photoColumn] = evidenceUrls;

    const { data, error } = await supabaseAdmin().from("case_responses").update(updatePayload).eq("id", response.id).select("*, users!responder_user_id(full_name)").single();
    if (error) return serverError(error.message);

    if (data) await audit({ tableName: "case_responses", recordId: response.id, action: "UPDATE", actorId: user.id, actorRole: user.role, oldData: response, newData: data });

    const { data: caseRecord } = await supabaseAdmin().from("cases").select("status").eq("id", caseId).maybeSingle();
    const previousCaseStatus = caseRecord?.status as string | undefined;

    if (status === "on_scene" && previousCaseStatus && previousCaseStatus !== "action_taken") {
      await supabaseAdmin().from("cases").update({ status: "action_taken", updated_at: new Date().toISOString() }).eq("id", caseId);
      await supabaseAdmin().from("case_events").insert({ case_id: caseId, actor_id: user.id, from_status: previousCaseStatus, to_status: "action_taken", notes: "Responder on scene" });
    } else if (status === "completed" && previousCaseStatus && previousCaseStatus !== "resolved") {
      await supabaseAdmin().from("cases").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", caseId);
      await supabaseAdmin().from("case_events").insert({ case_id: caseId, actor_id: user.id, from_status: previousCaseStatus, to_status: "resolved", notes: notes ?? "Response completed" });
    }

    return ok(mapCaseResponse(data), "Status updated");
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
    const { data: active } = await supabaseAdmin().from("case_responses").select("*").eq("case_id", caseId).eq("responder_user_id", user.id).not("status", "in", "(completed,abandoned)").maybeSingle();
    if (!active) return notFound("No active response found for this case");

    const { data, error } = await supabaseAdmin().from("case_responses").update({ status: "abandoned", notes: reason ?? "Responder abandoned", abandoned_at: new Date().toISOString() }).eq("id", active.id).select("*, users!responder_user_id(full_name)").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "case_responses", recordId: data.id, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });

    // Reopen the case so another responder can see and claim it - an abandoned
    // rescue must never be left stuck with no one able to pick it up.
    const { data: caseRecord } = await supabaseAdmin().from("cases").select("status").eq("id", caseId).maybeSingle();
    if (caseRecord && caseRecord.status !== "open" && caseRecord.status !== "resolved" && caseRecord.status !== "closed") {
      await supabaseAdmin().from("cases").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", caseId);
      await supabaseAdmin().from("case_events").insert({ case_id: caseId, actor_id: user.id, from_status: caseRecord.status, to_status: "open", notes: reason ?? "Responder abandoned - reopened for another responder" });
    }

    return ok(mapCaseResponse(data), "Claim abandoned");
  } catch {
    return serverError();
  }
}

async function handleGetResponse(req: NextRequest, caseId: string, _user: { id: string; role: string }) {
  const { data, error } = await supabaseAdmin().from("case_responses").select("*, users!responder_user_id(full_name)").eq("case_id", caseId).order("claimed_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return notFound("No active response found");
  return ok(mapCaseResponse(data), "Response loaded");
}
