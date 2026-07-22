import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const ConflictReportSchema = z.object({
  conflictType: z.string().min(1),
  description: z.string().min(1),
  location: LocationSchema,
  locationText: z.string().optional(),
  severity: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(ConflictReportSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { conflictType, description, location, locationText, severity } = parsed.data;

    const { data, error } = await supabaseAdmin().from("conflict_reports").insert({
      reporter_user_id: authResult.user.id,
      conflict_type: conflictType,
      description,
      location_text: locationText ?? null,
      location: `POINT(${location.longitude} ${location.latitude})`,
      severity: severity ?? "medium",
      created_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "conflict_reports", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(data, "Conflict report submitted");
  } catch {
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    let query = supabaseAdmin().from("conflict_reports").select("*");
    if (status) query = query.eq("status", status);

    if (!["admin", "govt", "ngo"].includes(authResult.user.role)) {
      query = query.eq("reporter_user_id", authResult.user.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Conflict reports loaded");
  } catch {
    return serverError();
  }
}
