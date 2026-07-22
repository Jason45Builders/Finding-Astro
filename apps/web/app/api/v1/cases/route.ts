import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, optionalAuth, requireTier, AuthenticatedUser } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { GUEST_USER_ID } from "@/lib/guest";
import { LocationSchema, validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const CaseStatusEnum = z.enum(["open", "in_review", "action_taken", "resolved", "closed"]);
const CasePriorityEnum = z.enum(["low", "medium", "high"]);

const CreateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1),
  location: LocationSchema,
  locationText: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  animalId: z.string().uuid().optional(),
  priority: CasePriorityEnum.optional(),
  severity: z.string().optional(),
  guestPhone: z.string().optional(),
});

const UpdateCaseSchema = z.object({
  status: CaseStatusEnum.optional(),
  priority: CasePriorityEnum.optional(),
  resolutionNotes: z.string().optional(),
});

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

    let query = supabaseAdmin().from("cases").select("*");

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
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
  const subAction = pathParts[pathParts.length - 1];
  const queryCaseType = url.searchParams.get("caseType");

  if (subAction === "emergency" || queryCaseType === "emergency") {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
    }
    const authResult = await optionalAuth(req);
    const user = authResult ?? null;
    return handleEmergency(req, user);
  }

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    if (subAction === "abuse") return handleCase(req, authResult.user, "abuse");
    if (subAction === "conflict") return handleCase(req, authResult.user, "conflict");
    if (subAction === "abc") return handleCase(req, authResult.user, "abc");
    return handleCase(req, authResult.user, "rescue");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cases POST]", msg, err);
    return serverError(msg);
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

async function handleEmergency(req: NextRequest, user: AuthenticatedUser | null) {
  // Emergency path — no auth required, no tier requirement (tier 0)
  return createCaseRecord(req, user, "emergency");
}

async function createCaseRecord(req: NextRequest, user: AuthenticatedUser | null, caseType: string) {
  const raw = await req.json();
  const parsed = validateBody(CreateCaseSchema, raw);
  if (!parsed.ok) return parsed.response;
  const { title, description, location, locationText, evidenceUrls, animalId, priority, severity, guestPhone } = parsed.data;

  if (!location) return badRequest("VALIDATION_ERROR", "latitude and longitude are required");

  const caseStatus = caseType === "emergency" || caseType === "rescue" ? "open" : "in_review";

  const reporterUserId = caseType === "emergency" ? (user?.id ?? GUEST_USER_ID) : (user as AuthenticatedUser).id;

    const { data, error } = await supabaseAdmin().from("cases").insert({
      case_type: caseType === "emergency" ? "rescue" : caseType,
      status: caseStatus,
      priority: priority ?? (caseType === "emergency" ? "high" : "medium"),
      title: title ?? `${caseType} case`,
      description,
      location_text: locationText ?? null,
      location: `POINT(${location.longitude} ${location.latitude})`,
      evidence_urls: evidenceUrls ?? [],
      animal_id: animalId ?? null,
      reporter_user_id: reporterUserId,
      guest_phone: guestPhone ?? null,
    }).select("*").single();

    if (error) {
      if ((error as { code?: string }).code === "23503") return badRequest("REFERENCE_NOT_FOUND", "A referenced record does not exist");
      return serverError(error.message);
    }

    if (data) {
      await audit({ tableName: "cases", recordId: data.id, action: "INSERT", actorId: reporterUserId, actorRole: user?.role ?? "guest_system", newData: data });
    }

    if (caseType === "emergency") {
      try {
        await supabaseAdmin().from("notifications").insert({ type: "case", title: `Emergency ${severity ?? "rescue"} case`, message: description, payload: { caseId: data?.id, caseType, severity } });
      } catch { /* non-fatal */ }
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

    const raw = await req.json();
    const parsed = validateBody(UpdateCaseSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, priority, resolutionNotes } = parsed.data;

    const { data: existing } = await supabaseAdmin().from("cases").select("status, priority, title, description, resolution_notes").eq("id", caseId).single();
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

    const { data, error } = await supabaseAdmin().from("cases").update(update).eq("id", caseId).select("*").single();
    if (error) return serverError(error.message);

    if (data) {
      await audit({ tableName: "cases", recordId: caseId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: existing, newData: data });
    }

    return ok(data, "Case updated");
  } catch {
    return serverError();
  }
}
