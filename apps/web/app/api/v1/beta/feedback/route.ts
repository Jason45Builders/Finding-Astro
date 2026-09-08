import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const CATEGORIES = [
  "bug",
  "feature_request",
  "ui_ux",
  "performance",
  "accessibility",
  "documentation",
  "other",
] as const;

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

const BetaFeedbackSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  severity: z.enum(SEVERITIES).default("medium"),
});

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`beta-feedback:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(BetaFeedbackSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { category, title, description, severity } = parsed.data;

    const { data, error } = await supabaseAdmin().from("beta_feedback").insert({
      user_id: authResult.user.id,
      category,
      title,
      description,
      severity,
    }).select("*").single();

    if (error || !data) return serverError(error?.message ?? "Failed to submit feedback");

    await audit({ tableName: "beta_feedback", recordId: (data as Record<string, unknown>).id as string, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok({ id: (data as Record<string, unknown>).id as string }, "Feedback submitted");
  } catch {
    return serverError("Failed to submit feedback");
  }
}
