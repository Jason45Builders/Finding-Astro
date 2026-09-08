import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export type NearbyResponder = {
  id: string;
  fullName: string | null;
  role: string;
  vehicleType: string | null;
  vehicleCapacity: number | null;
  serviceRadiusKm: number | null;
  reputationScore: number;
  distanceKm: number;
  isAvailable: boolean;
};

function parseDistanceKm(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return null;
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`responders-nearby:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const radiusKm = Number(url.searchParams.get("radius_km") ?? "10");
    const availableOnly = url.searchParams.get("available_only") !== "false";

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return badRequest("BAD_REQUEST", "Valid lat/lng are required");
    }
    const clampedRadius = Math.min(Math.max(radiusKm, 1), 100);

    const admin = supabaseAdmin();
    const point = `SRID=4326;POINT(${lng} ${lat})`;

    let query = admin
      .from("users")
      .select("id, full_name, role, vehicle_type, vehicle_capacity, service_radius_km, reputation_score, is_available, home_location")
      .neq("id", authResult.user.id)
      .not("home_location", "is", null)
      .limit(100);

    if (availableOnly) {
      query = query.eq("is_available", true);
    }

    const { data, error } = await query;

    if (error) return serverError(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      role: string;
      vehicle_type: string | null;
      vehicle_capacity: number | null;
      service_radius_km: number | null;
      reputation_score: number;
      is_available: boolean;
      home_location: string | null;
    }>;

    const nearby: NearbyResponder[] = [];
    for (const row of rows) {
      const raw = row.home_location;
      if (!raw) continue;
      const m = raw.match(/POINT\(([^ ]+) ([^)]+)\)/);
      if (!m) continue;
      const rLng = Number(m[1]);
      const rLat = Number(m[2]);
      if (!Number.isFinite(rLng) || !Number.isFinite(rLat)) continue;

      const dlat = rLat - lat;
      const dlng = rLng - lng;
      const distanceKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111.32;
      if (distanceKm > clampedRadius) continue;

      nearby.push({
        id: row.id,
        fullName: row.full_name,
        role: row.role,
        vehicleType: row.vehicle_type,
        vehicleCapacity: row.vehicle_capacity,
        serviceRadiusKm: row.service_radius_km,
        reputationScore: row.reputation_score,
        distanceKm: Math.round(distanceKm * 100) / 100,
        isAvailable: row.is_available,
      });
    }

    nearby.sort((a, b) => a.distanceKm - b.distanceKm);

    return ok(nearby.slice(0, 20), "Nearby responders loaded");
  } catch {
    return serverError();
  }
}
