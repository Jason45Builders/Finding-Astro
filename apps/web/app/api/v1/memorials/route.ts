import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound, created } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const MemorialSchema = z.object({
  dogName: z.string().min(1).max(200),
  category: z.enum(["natural_death", "suspicious_death"]),
  description: z.string().min(1).max(2000),
  bestMemory: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  dateOfDeath: z.string().min(1),
  causeOfDeath: z.string().max(300).optional(),
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
  isAnonymous: z.boolean().optional(),
});

function mapMemorial(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    dogName: row.dog_name as string,
    category: row.category as string,
    description: row.description as string,
    bestMemory: row.best_memory as string | null,
    location: row.location as string | null,
    latitude: row.location_geog ? Number((row.location_geog as { y: number }).y || 0) : null,
    longitude: row.location_geog ? Number((row.location_geog as { x: number }).x || 0) : null,
    dateOfDeath: row.date_of_death as string,
    causeOfDeath: row.cause_of_death as string | null,
    evidenceUrls: (row.evidence_urls as string[]) ?? [],
    reporterUserId: row.reporter_user_id as string,
    isAnonymous: Boolean(row.is_anonymous),
    isVerified: Boolean(row.is_verified),
    isPublic: Boolean(row.is_public),
    verifiedBy: row.verified_by as string | null,
    verifiedAt: row.verified_at as string | null,
    createdAt: row.created_at as string,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);

    let query = supabaseAdmin().from("memorial_posts").select("*").eq("is_public", true);
    if (category) query = query.eq("category", category);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapMemorial), "Memorials loaded");
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
  const rate = await checkRateLimit(`memorial-create:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(MemorialSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { dogName, category, description, bestMemory, location, latitude, longitude, dateOfDeath, causeOfDeath, evidenceUrls, isAnonymous } = parsed.data;

    const payload: Record<string, unknown> = {
      dog_name: dogName,
      category,
      description,
      best_memory: bestMemory ?? null,
      location: location ?? null,
      date_of_death: dateOfDeath,
      cause_of_death: causeOfDeath ?? null,
      evidence_urls: evidenceUrls ?? [],
      reporter_user_id: authResult.user.id,
      is_anonymous: isAnonymous ?? true,
    };

    if (latitude !== undefined && longitude !== undefined) {
      payload.location_geog = `SRID=4326;POINT(${longitude} ${latitude})`;
    }

    if (category === "natural_death") {
      payload.is_verified = true;
      payload.is_public = true;
      payload.verified_at = new Date().toISOString();
      payload.verified_by = authResult.user.id;
    } else {
      payload.is_verified = false;
      payload.is_public = false;
    }

    const { data, error } = await supabaseAdmin().from("memorial_posts").insert(payload).select("*").single();
    if (error || !data) return serverError(error?.message ?? "Failed to create memorial");

    return created(mapMemorial(data), category === "natural_death" ? "Memorial published" : "Memorial submitted for review");
  } catch {
    return serverError();
  }
}
