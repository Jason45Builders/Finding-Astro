import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`logout:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const refreshToken = (raw as Record<string, unknown>).refreshToken as string | undefined;
    if (refreshToken) {
      const tokenHash = await import("@/lib/jwt").then(m => m.hashToken(refreshToken));
      await supabaseAdmin().from("refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("token_hash", tokenHash).eq("user_id", authResult.user.id);
    }
    await supabaseAdmin().from("refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("user_id", authResult.user.id).is("revoked_at", null);
    await audit({ tableName: "refresh_tokens", recordId: authResult.user.id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { action: "logout" } });
    return ok(null, "Logged out");
  } catch {
    return ok(null, "Logged out");
  }
}
