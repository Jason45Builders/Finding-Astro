import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError, notFound } from "@/lib/api-response";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

function mapEducationContent(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    topicKey: row.topic_key as string,
    title: row.title as string,
    audience: row.audience as string,
    summary: row.summary as string,
    actionPoints: (row.action_points as string[]) ?? [],
    triggerCaseType: row.trigger_case_type as string | null,
    triggerAnimalStatus: row.trigger_animal_status as string | null,
    languageCode: row.language_code as string,
    createdAt: row.created_at as string,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const topicKey = url.searchParams.get("topicKey");
    const audience = url.searchParams.get("audience");

    let query = supabaseAdmin().from("education_content").select("*");
    if (topicKey) query = query.eq("topic_key", topicKey);
    if (audience) query = query.eq("audience", audience);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapEducationContent), "Education content loaded");
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
  const rate = await checkRateLimit(`education:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const { topicKey, title, audience, summary, actionPoints, triggerCaseType, triggerAnimalStatus, languageCode } = raw as Record<string, unknown>;

    if (!topicKey || !title || !summary) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "topicKey, title, and summary are required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { data, error } = await supabaseAdmin().from("education_content").insert({
      topic_key: topicKey,
      title,
      audience: audience ?? "community",
      summary,
      action_points: (actionPoints as string[] | undefined) ?? [],
      trigger_case_type: triggerCaseType ?? null,
      trigger_animal_status: triggerAnimalStatus ?? null,
      language_code: languageCode ?? "en",
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(mapEducationContent(data), "Education content created");
  } catch {
    return serverError();
  }
}
