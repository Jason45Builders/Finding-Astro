import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, optionalAuth, AuthenticatedUser } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { GUEST_USER_ID } from "@/lib/guest";
import { LocationSchema, validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { getChannel } from "@/lib/notify-channels";

const CreateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1),
  location: LocationSchema,
  locationText: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  animalId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  severity: z.string().optional(),
  guestPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const authResult = await optionalAuth(req);
  const user = authResult ?? null;
  return createCaseRecord(req, user, "emergency");
}

async function createCaseRecord(req: NextRequest, user: AuthenticatedUser | null, caseType: string) {
  try {
    const raw = await req.json();
    const parsed = validateBody(CreateCaseSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { title, description, location, locationText, evidenceUrls, animalId, priority, severity, guestPhone } = parsed.data;

    const caseStatus = "open";
    const reporterUserId = user?.id ?? GUEST_USER_ID;

    const dbCaseType = "rescue";
    const { data, error } = await supabaseAdmin().from("cases").insert({
      case_type: dbCaseType,
      status: caseStatus,
      priority: priority ?? "high",
      title: title ?? "emergency case",
      description,
      location_text: locationText ?? null,
      location: `POINT(${location.longitude} ${location.latitude})`,
      evidence_urls: evidenceUrls ?? [],
      animal_id: animalId ?? null,
      reporter_user_id: reporterUserId,
      guest_phone: guestPhone ?? null,
    }).select("*").single();

    if (error) return serverError(error.message);

    if (data) {
      await audit({ tableName: "cases", recordId: data.id, action: "INSERT", actorId: reporterUserId, actorRole: user?.role ?? "guest_system", newData: data });
    }

    if (caseType === "rescue") {
      try {
        await supabaseAdmin().from("notifications").insert({ type: "case", title: `Emergency rescue case — ${title ?? "Untitled"}`, message: description, payload: { caseId: data?.id, caseType: dbCaseType, priority: priority ?? "high" } });

        const _body = `New ${priority ?? "medium"} priority ${dbCaseType} case reported at ${locationText ?? "unknown location"}. Case ID: ${data?.id}. Description: ${description ?? "No description"}`;
        const _to = process.env.EMERGENCY_NOTIFY_EMAIL ?? "";
        if (_to) {
          void getChannel("email").send(_to, `Emergency ${dbCaseType} case`, _body).catch(() => {});
        }
      } catch { /* non-fatal */ }
    }

    return ok(data, "Case created");
  } catch {
    return serverError();
  }
}
