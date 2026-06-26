import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireTier, AuthenticatedUser } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

const TIER_REQUIREMENTS: Record<string, number> = {
  claim_rescue_case: 1, add_animal_record: 1, view_case_details: 1,
  abuse_report: 2, conflict_report: 2, adopt_application: 2,
};

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const animalId = url.searchParams.get("animalId");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 200);

    let query = supabaseAdmin.from("cases").select("*");

    if (status) query = query.eq("status", status);
    if (animalId) query = query.eq("animal_id", animalId);

    if (!["admin", "govt", "ngo"].includes(authResult.user.role)) {
      query = query.or(`reporter_user_id.eq.${authResult.user.id},assigned_to_user_id.eq.${authResult.user.id}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Cases loaded", { count: data?.length ?? 0 });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
    const subAction = pathParts[pathParts.length - 1];

    if (subAction === "emergency") return handleEmergency(req, authResult.user);
    if (subAction === "abuse") return handleCase(req, authResult.user, "abuse");
    if (subAction === "conflict") return handleCase(req, authResult.user, "conflict");
    if (subAction === "abc") return handleCase(req, authResult.user, "abc");
    return handleCase(req, authResult.user, "rescue");
  } catch {
    return serverError();
  }
}

async function handleCase(req: NextRequest, user: AuthenticatedUser, caseType: string) {
  if (TIER_REQUIREMENTS[`${caseType}_report`]) {
    try { requireTier(user, TIER_REQUIREMENTS[`${caseType}_report`]!); } catch (e) {
      if (e instanceof Error) return new NextResponse(JSON.stringify({ success: false, code: "IDENTITY_TIER_REQUIRED", message: e.message.replace("IDENTITY_TIER_REQUIRED: ", "") }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  }
  return createCaseRecord(req, user, caseType);
}

async function handleEmergency(req: NextRequest, user: AuthenticatedUser) {
  // Emergency path — no tier requirement (tier 0)
  return createCaseRecord(req, user, "emergency");
}

async function createCaseRecord(req: NextRequest, user: { id: string; role: string }, caseType: string) {
  const body = await req.json();
  const { title, description, latitude, longitude, locationText, evidenceUrls, animalId, priority, severity, guestEmail } = body as Record<string, unknown>;

  if (typeof latitude !== "number" || typeof longitude !== "number") return badRequest("VALIDATION_ERROR", "latitude and longitude are required");

  const caseStatus = caseType === "emergency" || caseType === "rescue" ? "open" : "in_review";

  const { data, error } = await supabaseAdmin.from("cases").insert({
    case_type: caseType,
    status: caseStatus,
    priority: (priority as string | undefined) ?? (caseType === "emergency" ? "high" : "medium"),
    title: (title as string | undefined) ?? `${caseType} case`,
    description: description ?? "",
    location_text: locationText ?? null,
    location: `POINT(${longitude} ${latitude})`,
    evidence_urls: (evidenceUrls as string[] | undefined) ?? [],
    animal_id: animalId ?? null,
    reporter_user_id: caseType === "emergency" ? null : user.id,
    severity: (severity as string | undefined) ?? null,
    guest_phone: guestEmail ?? null,
  }).select("*").single();

  if (error) {
    if ((error as { code?: string }).code === "23503") return badRequest("REFERENCE_NOT_FOUND", "A referenced record does not exist");
    return serverError(error.message);
  }

  // Broadcast to nearby responders for emergencies
  if (caseType === "emergency") {
    await supabaseAdmin.from("notifications").insert({ type: "case", title: `Emergency ${severity ?? "rescue"} case`, message: description ?? "New emergency rescue case", payload: { caseId: data?.id, caseType, severity } });
  }

  return ok(data, "Case created");
}

async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const caseId = url.pathname.replace(/\/api\/v1\/cases\//, "").replace(/\/.*$/, "");
    if (!caseId) return badRequest("VALIDATION_ERROR", "caseId is required");

    const body = await req.json();
    const { status, priority, resolutionNotes } = body as { status?: string; priority?: string; resolutionNotes?: string };

    const { data: existing } = await supabaseAdmin.from("cases").select("status").eq("id", caseId).single();
    if (!existing) return notFound("Case not found");

    const current = existing.status as string;
    if (status && current !== status && !["admin", "govt", "ngo"].includes(authResult.user.role)) {
      const allowed: Record<string, string[]> = { open: ["in_review", "closed"], in_review: ["action_taken", "resolved", "closed"], action_taken: ["resolved", "closed"], resolved: ["closed"] };
      if (!(allowed[current] ?? []).includes(status)) return badRequest("INVALID_STATUS_TRANSITION", `Cannot move from "${current}" to "${status}"`);
    }

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (resolutionNotes !== undefined) update.resolution_notes = resolutionNotes;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin.from("cases").update(update).eq("id", caseId).select("*").single();
    if (error) return serverError(error.message);
    return ok(data, "Case updated");
  } catch {
    return serverError();
  }
}
