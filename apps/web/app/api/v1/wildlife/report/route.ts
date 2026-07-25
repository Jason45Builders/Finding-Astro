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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

    const { data: speciesInfo } = await supabaseAdmin().from("wildlife_species_categories").select("*").eq("name", speciesCategory).maybeSingle();

    const { data, error } = await supabaseAdmin().from("cases").insert({
      case_type: "wildlife",
      status: "open",
      priority: (speciesInfo?.handling_risk as string | undefined)?.toLowerCase().includes("high") ? "high" : "medium",
      title: `Wildlife: ${speciesInfo?.display_name ?? speciesCategory}`,
      description,
      location_text: locationText ?? null,
      location: `POINT(${loc.longitude} ${loc.latitude})`,
      evidence_urls: photoUrls ?? [],
      reporter_user_id: authResult.user.id,
      wildlife_species_category: speciesCategory,
      wildlife_condition: condition,
      public_guidance_shown: true,
    }).select("id").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "cases", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });

    const { data: centerRows } = await supabaseAdmin().from("wildlife_centers").select("*").eq("is_active", true);
    const nearestCenters = (centerRows ?? [])
      .filter((c) => c.latitude !== null && c.longitude !== null)
      .map((c) => ({ row: c, distanceKm: haversineKm(loc.latitude, loc.longitude, Number(c.latitude), Number(c.longitude)) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
      .map(({ row: c, distanceKm }) => ({
        id: c.id as string,
        name: c.name as string,
        phone: c.phone as string,
        address: c.address as string | null,
        city: c.city as string | null,
        location: { latitude: Number(c.latitude), longitude: Number(c.longitude) },
        acceptedSpecies: (c.accepted_species as string[]) ?? [],
        operatingHours: c.operating_hours as string | null,
        is24hr: (c.is_24hr as boolean) ?? false,
        distanceKm: Math.round(distanceKm * 10) / 10,
      }));

    return ok({
      caseRecord: { id: data.id },
      guidance: {
        displayName: speciesInfo?.display_name ?? speciesCategory,
        publicGuidance: speciesInfo?.public_guidance ?? "Keep a safe distance and do not attempt to touch or capture the animal. Wait for a specialist responder.",
        doNotDo: speciesInfo?.do_not_do ?? "Do not attempt to handle, feed, or transport the animal yourself.",
      },
      nearestCenters,
    }, "Wildlife report submitted");
  } catch {
    return serverError();
  }
}
