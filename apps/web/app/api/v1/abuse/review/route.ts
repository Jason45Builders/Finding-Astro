import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const denied = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role) ? null : new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  if (denied) return denied;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`abuse-review:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentLoginFailures } = await supabaseAdmin()
      .from("login_attempts")
      .select("id, email, ip_address, attempted_at")
      .eq("success", false)
      .gte("attempted_at", since)
      .order("attempted_at", { ascending: false })
      .limit(200);

    const { data: recentReports } = await supabaseAdmin()
      .from("cases")
      .select("id, title, status, priority, reporter_user_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    const ipCounts = new Map<string, number>();
    for (const row of recentLoginFailures ?? []) {
      const key = (row as Record<string, unknown>).ip_address as string;
      ipCounts.set(key, (ipCounts.get(key) ?? 0) + 1);
    }
    const suspiciousIps = Array.from(ipCounts.entries()).filter(([, count]) => count >= 5).map(([ip, count]) => ({ ip, failedAttempts: count }));

    return ok({
      suspiciousIps,
      recentLoginFailures: (recentLoginFailures ?? []).map((r) => ({ ...(r as Record<string, unknown>), count: ipCounts.get((r as Record<string, unknown>).ip_address as string) ?? 1 })),
      recentReports: recentReports ?? [],
    }, "Abuse review loaded");
  } catch {
    return serverError("Failed to load abuse review data");
  }
}
