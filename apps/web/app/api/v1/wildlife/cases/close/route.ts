import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`wildlife-close:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const caseId = url.pathname.replace(/.*cases\//, "").replace(/\/close.*$/, "");
    if (!caseId) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "caseId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { data, error } = await supabaseAdmin().from("cases").update({
      status: "closed",
      updated_at: new Date().toISOString(),
    }).eq("id", caseId).eq("case_type", "wildlife").select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "cases", recordId: caseId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(null, "Wildlife case closed");
  } catch {
    return serverError();
  }
}
