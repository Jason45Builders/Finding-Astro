import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const PushTokenSchema = z.object({
  expoPushToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`push-token:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(PushTokenSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { expoPushToken } = parsed.data;

    await supabaseAdmin().from("users").update({ push_token: expoPushToken }).eq("id", authResult.user.id);
    await audit({ tableName: "users", recordId: authResult.user.id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { push_token: expoPushToken } });
    return ok(null, "Push token registered");
  } catch {
    return serverError("Failed to register push token");
  }
}
