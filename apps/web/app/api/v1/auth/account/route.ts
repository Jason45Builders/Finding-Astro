import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`account-delete:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const confirmation = (raw as Record<string, unknown>).confirmation as string | undefined;
    if (confirmation !== "DELETE") return badRequest("VALIDATION_ERROR", 'Please type DELETE to confirm account deletion');

    const { error } = await supabaseAdmin().from("users").delete().eq("id", authResult.user.id);
    if (error) return serverError(error.message);

    await audit({ tableName: "users", recordId: authResult.user.id, action: "DELETE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { reason: "user_requested_deletion" } });
    return ok(null, "Account deleted");
  } catch {
    return serverError("Failed to delete account");
  }
}
