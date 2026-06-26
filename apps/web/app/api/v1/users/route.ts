import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
    const subResource = pathParts[1];

    if (subResource === "users" && pathParts.length > 2 && pathParts[2] === "me") {
      if (pathParts[3] === "volunteer") {
        const { data, error } = await supabaseAdmin.from("users").select("id, email, full_name, role, is_available, active_case_limit, vehicle_type, vehicle_capacity, service_radius_km, home_location, reputation_score").eq("id", authResult.user.id).single();
        if (error) return serverError(error.message);
        return ok(data, "Volunteer profile loaded");
      }
      return ok({ id: authResult.user.id, email: authResult.user.email, role: authResult.user.role }, "User info");
    }

    if (subResource === "users" && pathParts.length > 2 && pathParts[2] === "responders" && pathParts[3] === "nearby") {
      const lat = url.searchParams.get("latitude");
      const lng = url.searchParams.get("longitude");
      if (!lat || !lng) return badRequest("VALIDATION_ERROR", "latitude and longitude required");
      const { data, error } = await supabaseAdmin.from("users").select("*").eq("role", "ngo").eq("is_available", true).limit(50);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Responders loaded");
    }

    if (subResource === "users" && pathParts.length === 2) {
      const { data, error } = await supabaseAdmin.from("users").select("id, email, full_name, role, is_available, identity_tier, created_at").limit(parseInt(url.searchParams.get("limit") ?? "50", 10));
      if (error) return serverError(error.message);
      return ok(data ?? [], "Users loaded");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");

    if (pathParts[1] === "users" && pathParts[2] === "me" && pathParts[3] === "volunteer") {
      const body = await req.json();
      const update: Record<string, unknown> = {};
      if (body.isAvailable !== undefined) update.is_available = body.isAvailable;
      if (body.activeCaseLimit !== undefined) update.active_case_limit = body.activeCaseLimit;
      if (body.vehicleType) update.vehicle_type = body.vehicleType;
      if (body.vehicleType === null) update.vehicle_type = null;
      if (body.serviceRadiusKm !== undefined) update.service_radius_km = body.serviceRadiusKm;
      if (body.homeLocation) update.home_location = `POINT(${body.homeLocation.longitude} ${body.homeLocation.latitude})`;
      const { data, error } = await supabaseAdmin.from("users").update(update).eq("id", authResult.user.id).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Volunteer profile updated");
    }

    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}
