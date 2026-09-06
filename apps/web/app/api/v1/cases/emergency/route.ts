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
import { sendExpoPushNotifications } from "@/lib/push-notify";
import { mapCase } from "@/lib/types";
import { decodeLocation } from "@/lib/geo";
import { broadcastCaseEvent } from "@/lib/case-stream";

const CreateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).max(5000),
  location: LocationSchema,
  locationText: z.string().max(500).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  animalId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  severity: z.string().max(100).optional(),
  guestPhone: z.string().max(20).optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(ip, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const authResult = await optionalAuth(req);
  const user = authResult ?? null;
  if (user?.isBanned) return new NextResponse(JSON.stringify({ success: false, code: "ACCOUNT_BANNED", message: "This account has been suspended" }), { status: 403, headers: { "Content-Type": "application/json" } });
  return createCaseRecord(req, user, "emergency");
}

async function createCaseRecord(req: NextRequest, user: AuthenticatedUser | null, caseType: string) {
  try {
    const raw = await req.json();
    const parsed = validateBody(CreateCaseSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { title, description, location, locationText, evidenceUrls, animalId, priority, severity, guestPhone, idempotencyKey } = parsed.data;

    const caseStatus = "open";
    const reporterUserId = user?.id ?? GUEST_USER_ID;

    if (idempotencyKey) {
      const { data: existing } = await supabaseAdmin().from("cases").select("id, status").eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existing) {
        const { data: fresh } = await supabaseAdmin().from("cases").select("*").eq("id", (existing as Record<string, unknown>).id as string).single();
        if (fresh) return ok(mapCase({ ...(fresh as Record<string, unknown>), location: decodeLocation((fresh as Record<string, unknown>)?.location) }), "Case already exists");
      }
    }

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
      idempotency_key: idempotencyKey ?? null,
    }).select("*").single();

    if (error) return serverError(error.message);

    if (data) {
      await audit({ tableName: "cases", recordId: data.id, action: "INSERT", actorId: reporterUserId, actorRole: user?.role ?? "guest_system", newData: data });
      broadcastCaseEvent({ type: "created", caseId: data.id, caseType: dbCaseType, priority: (data as Record<string, unknown>).priority as string, status: (data as Record<string, unknown>).status as string, locationText: (data as Record<string, unknown>).location_text as string | null, timestamp: new Date().toISOString() });
    }

    if (caseType === "rescue") {
      try {
        const { data: responders } = await supabaseAdmin()
          .from("users")
          .select("id, push_token")
          .in("role", ["ngo", "govt", "admin"])
          .eq("is_available", true)
          .eq("is_banned", false)
          .limit(50);

        const responderIds = (responders ?? []).map((r: { id: string }) => r.id);

        if (responderIds.length > 0) {
          const notificationRows = responderIds.map((responderId: string) => ({
            user_id: responderId,
            type: "case",
            title: `Emergency rescue case — ${title ?? "Untitled"}`,
            message: description,
            payload: { caseId: data?.id, caseType: dbCaseType, priority: priority ?? "high" },
          }));
          await supabaseAdmin().from("notifications").insert(notificationRows);
        }

        const pushTokens = (responders ?? [])
          .map((r: { push_token: string | null }) => r.push_token)
          .filter((token: string | null): token is string => !!token);

        if (pushTokens.length > 0) {
          const pushMessages = pushTokens.map((token: string) => ({
            to: token,
            title: `Emergency rescue case — ${title ?? "Untitled"}`,
            body: description,
            data: { caseId: data?.id, caseType: dbCaseType, priority: priority ?? "high" },
          }));
          void sendExpoPushNotifications(pushMessages).catch(() => {});
        }

        const _body = `New ${priority ?? "medium"} priority ${dbCaseType} case reported at ${locationText ?? "unknown location"}. Case ID: ${data?.id}. Description: ${description ?? "No description"}`;
        const _to = process.env.EMERGENCY_NOTIFY_EMAIL ?? "";
        if (_to) {
          void getChannel("email").send(_to, `Emergency ${dbCaseType} case`, _body).catch(() => {});
        }
      } catch { /* non-fatal */ }
    }

    return ok(mapCase({ ...(data as Record<string, unknown>), location: decodeLocation((data as Record<string, unknown>)?.location) }), "Case created");
  } catch {
    return serverError();
  }
}
