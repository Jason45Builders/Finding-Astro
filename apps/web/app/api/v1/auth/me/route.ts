import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, notFound, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const mapUser = (row: Record<string, unknown>) => ({
  id: row.id as string,
  phone: row.email as string,
  fullName: row.full_name as string | null,
  role: row.role as string,
  email: row.email as string,
  profilePhotoUrl: (row.profile_photo_url as string | null) ?? null,
  reputationScore: Number(row.reputation_score ?? 0),
  activeCaseLimit: Number(row.active_case_limit ?? 5),
  isAvailable: Boolean(row.is_available),
  vehicleType: (row.vehicle_type as string | null) ?? null,
  vehicleCapacity: (row.vehicle_capacity as number | null) ?? null,
  serviceRadiusKm: Number(row.service_radius_km ?? 5),
  homeLocation: row.home_location
    ? { latitude: Number((row.home_location as { y: number }).y || 0), longitude: Number((row.home_location as { x: number }).x || 0) }
    : null,
  activityCount: Number(row.activity_count ?? 0),
  completedCaseCount: Number(row.completed_case_count ?? 0),
  lastLoginAt: (row.last_login_at as string | null) ?? null,
  lastActiveAt: (row.last_active_at as string | null) ?? null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { data, error } = await supabaseAdmin()
      .from("users")
      .select("id, email, full_name, role, reputation_score, active_case_limit, is_available, vehicle_type, vehicle_capacity, service_radius_km, home_location, activity_count, completed_case_count, last_login_at, last_active_at, created_at, updated_at, profile_photo_url")
      .eq("id", authResult.user.id)
      .single();

    if (error || !data) return notFound("User not found");
    return ok(mapUser(data), "Profile loaded");
  } catch {
    return serverError("Failed to fetch profile");
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`profile-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(z.object({ profilePhotoUrl: z.string().url().nullable().optional() }).passthrough(), raw);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as { profilePhotoUrl?: string | null };

    const update: Record<string, unknown> = {};
    if (body.profilePhotoUrl !== undefined) update.profile_photo_url = body.profilePhotoUrl;

    const { data, error } = await supabaseAdmin().from("users").update(update).eq("id", authResult.user.id).select("*").single();
    if (error) return serverError(error.message);
    return ok(mapUser(data), "Profile photo updated");
  } catch {
    return serverError("Failed to update profile");
  }
}
