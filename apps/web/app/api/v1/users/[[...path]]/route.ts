import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const UpdateVolunteerSchema = z.object({
  isAvailable: z.boolean().optional(),
  activeCaseLimit: z.number().int().positive().optional(),
  vehicleType: z.string().nullable().optional(),
  serviceRadiusKm: z.number().nonnegative().optional(),
  homeLocation: LocationSchema.nullable().optional(),
}).passthrough();

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/users\/?/, "").split("/").filter(Boolean);

    if (pathParts[0] === "me") {
      if (pathParts[1] === "volunteer") {
        const { data, error } = await supabaseAdmin().from("users").select("id, email, full_name, role, is_available, active_case_limit, vehicle_type, vehicle_capacity, service_radius_km, home_location, reputation_score").eq("id", authResult.user.id).single();
        if (error) return serverError(error.message);
        return ok(data, "Volunteer profile loaded");
      }
      return ok({ id: authResult.user.id, email: authResult.user.email, role: authResult.user.role }, "User info");
    }

    if (pathParts[0] === "responders" && pathParts[1] === "nearby") {
      const lat = url.searchParams.get("latitude");
      const lng = url.searchParams.get("longitude");
      if (!lat || !lng) return badRequest("VALIDATION_ERROR", "latitude and longitude required");
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(url.searchParams.get("radiusKm") ?? "10");
      const { data, error } = await supabaseAdmin().from("users").select("id, email, full_name, role, is_available, home_location, reputation_score, service_radius_km, active_case_limit, completed_case_count").eq("role", "ngo").eq("is_available", true).limit(200);
      if (error) return serverError(error.message);

      const R = 6371;
      const toRad = (deg: number) => deg * Math.PI / 180;
      const candidates = (data ?? [])
        .map((row) => {
          const loc = (row as Record<string, unknown>).home_location as { x: number; y: number } | null;
          if (!loc) return null;
          const responderLat = loc.y;
          const responderLng = loc.x;
          const dLat = toRad(responderLat - userLat);
          const dLng = toRad(responderLng - userLng);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(userLat)) * Math.cos(toRad(responderLat)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          const effectiveRadius = Number((row as Record<string, unknown>).service_radius_km ?? 10);
          return { ...row, distance, withinRadius: distance <= effectiveRadius };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && item.withinRadius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 50);

      return ok(candidates, "Nearby responders loaded");
    }

    if (pathParts.length === 0) {
      if (!["admin", "govt"].includes(authResult.user.role)) {
        return new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "Only admins and government officers can list all users" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      const { data, error } = await supabaseAdmin().from("users").select("id, email, full_name, role, is_available, identity_tier, created_at").limit(parseInt(url.searchParams.get("limit") ?? "50", 10));
      if (error) return serverError(error.message);
      return ok(data ?? [], "Users loaded");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`user-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/users\/?/, "").split("/").filter(Boolean);

    if (pathParts[0] === "me" && pathParts[1] === "volunteer") {
      const raw = await req.json();
      const parsed = validateBody(UpdateVolunteerSchema, raw);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;

      const update: Record<string, unknown> = {};
      if (body.isAvailable !== undefined) update.is_available = body.isAvailable;
      if (body.activeCaseLimit !== undefined) update.active_case_limit = body.activeCaseLimit;
      if (body.vehicleType !== undefined) update.vehicle_type = body.vehicleType;
      if (body.serviceRadiusKm !== undefined) update.service_radius_km = body.serviceRadiusKm;
      if (body.homeLocation) update.home_location = `POINT(${body.homeLocation.longitude} ${body.homeLocation.latitude})`;
      const { data, error } = await supabaseAdmin().from("users").update(update).eq("id", authResult.user.id).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Volunteer profile updated");
    }

    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}
