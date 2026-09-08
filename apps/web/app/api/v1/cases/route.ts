import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, optionalAuth, requireTier, requireCsrf, AuthenticatedUser } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { decodeLocation } from "@/lib/geo";
import { mapCase } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { broadcastCaseEvent } from "@/lib/case-stream";

const CaseStatusEnum = z.enum(["open", "in_review", "action_taken", "resolved", "closed"]);
const CasePriorityEnum = z.enum(["low", "medium", "high"]);

const CreateCaseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000),
  location: LocationSchema,
  locationText: z.string().max(500).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  animalId: z.string().uuid().optional(),
  priority: CasePriorityEnum.optional(),
  severity: z.string().max(100).optional(),
  guestPhone: z.string().max(20).optional(),
  idempotencyKey: z.string().optional(),
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
    const includeBanned = url.searchParams.get("includeBannedReporters") === "true" && ["admin", "govt", "ngo"].includes(authResult.user.role);

    let query = supabaseAdmin().from("cases").select("*");

    if (status) query = query.eq("status", status);
    if (animalId) query = query.eq("animal_id", animalId);

    if (!["admin", "govt", "ngo"].includes(authResult.user.role) && status !== "open") {
      query = query.or(`status.eq.open,reporter_user_id.eq.${authResult.user.id},assigned_to_user_id.eq.${authResult.user.id}`);
    } else if (!includeBanned) {
      const { data: bannedUsers } = await supabaseAdmin().from("users").select("id").eq("is_banned", true).limit(500);
      const bannedIds = (bannedUsers ?? []).map((u: Record<string, unknown>) => u.id as string);
      if (bannedIds.length > 0) {
        query = query.not("reporter_user_id", "in", bannedIds);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);

    const cases = (data ?? []).map((c) => mapCase({ ...(c as Record<string, unknown>), location: decodeLocation((c as Record<string, unknown>).location) }));
    return ok(cases, "Cases loaded", { count: cases.length });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`case-create:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
  const subAction = pathParts[pathParts.length - 1];

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

async function createCaseRecord(req: NextRequest, user: AuthenticatedUser, caseType: string) {
  const raw = await req.json();
  const parsed = validateBody(CreateCaseSchema, raw);
  if (!parsed.ok) return parsed.response;
  const { title, description, location, locationText, evidenceUrls, animalId, priority, guestPhone, idempotencyKey } = parsed.data;

  if (!location) return badRequest("VALIDATION_ERROR", "latitude and longitude are required");

  if (idempotencyKey) {
    const { data: existing } = await supabaseAdmin().from("cases").select("id, status").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) {
      const { data: fresh } = await supabaseAdmin().from("cases").select("*").eq("id", (existing as Record<string, unknown>).id as string).single();
      if (fresh) return ok(mapCase({ ...(fresh as Record<string, unknown>), location: decodeLocation((fresh as Record<string, unknown>)?.location) }), "Case already exists");
    }
  }

  const { data, error } = await supabaseAdmin().from("cases").insert({
    case_type: caseType,
    status: caseType === "rescue" ? "open" : "in_review",
    priority: priority ?? "medium",
    title: title ?? `${caseType} case`,
    description,
    location_text: locationText ?? null,
    location: `POINT(${location.longitude} ${location.latitude})`,
    evidence_urls: evidenceUrls ?? [],
    animal_id: animalId ?? null,
    reporter_user_id: user.id,
    guest_phone: guestPhone ?? null,
    idempotency_key: idempotencyKey ?? null,
  }).select("*").single();

  if (error) {
    if ((error as { code?: string }).code === "23503") return badRequest("REFERENCE_NOT_FOUND", "A referenced record does not exist");
    return serverError(error.message);
  }

  if (data) {
    await audit({ tableName: "cases", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
    broadcastCaseEvent({ type: "created", caseId: data.id, caseType: (data as Record<string, unknown>).case_type as string, priority: (data as Record<string, unknown>).priority as string, status: (data as Record<string, unknown>).status as string, locationText: (data as Record<string, unknown>).location_text as string | null, timestamp: new Date().toISOString() });
  }

  return ok(mapCase({ ...(data as Record<string, unknown>), location: decodeLocation((data as Record<string, unknown>)?.location) }), "Case created");
}
