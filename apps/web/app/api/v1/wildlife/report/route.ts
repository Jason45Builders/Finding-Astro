import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const WildlifeReportSchema = z.object({
  speciesCategory: z.string().min(1),
  condition: z.string(),
  description: z.string().min(1),
  location: LocationSchema,
  locationText: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
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
    const parsed = validateBody(WildlifeReportSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { speciesCategory, condition, description, location: loc, locationText, photoUrls } = parsed.data;

    const { data, error } = await supabaseAdmin().from("wildlife_reports").insert({
      reporter_user_id: authResult.user.id,
      species_category: speciesCategory,
      condition,
      description,
      location: `POINT(${loc.longitude} ${loc.latitude})`,
      location_text: locationText ?? null,
      photo_urls: photoUrls ?? [],
      created_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "wildlife_reports", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(data, "Wildlife report submitted");
  } catch {
    return serverError();
  }
}
