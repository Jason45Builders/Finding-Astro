import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { validateBody, LocationSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const AmbulanceServiceSchema = z.object({
  name: z.string().min(1).max(200),
  providerType: z.string().min(1).max(50),
  phone: z.string().min(7).max(20),
  alternatePhone: z.string().max(20).optional(),
  vehicleType: z.string().max(100).optional(),
  capacity: z.number().int().positive().optional(),
  city: z.string().max(100).optional(),
  location: LocationSchema.optional(),
  locationText: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

const AmbulanceRequestSchema = z.object({
  caseId: z.string().uuid().optional(),
  animalId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  patientCondition: z.string().max(500).optional(),
  pickupLocation: LocationSchema,
  pickupLocationText: z.string().max(200).optional(),
  destinationLocation: LocationSchema.optional(),
  destinationLocationText: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

const AmbulanceUpdateSchema = z.object({
  status: z.enum(["requested", "acknowledged", "dispatched", "arrived", "completed", "cancelled"]).optional(),
  serviceId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  patientCondition: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  cancellationReason: z.string().max(500).optional(),
});

function mapAmbulanceService(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    providerType: row.provider_type as string,
    phone: row.phone as string,
    alternatePhone: row.alternate_phone as string | null,
    vehicleType: row.vehicle_type as string | null,
    capacity: row.capacity as number | null,
    city: row.city as string | null,
    location: row.location as { latitude: number; longitude: number } | null,
    locationText: row.location_text as string | null,
    isActive: (row.is_active as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapAmbulanceRequest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    caseId: row.case_id as string | null,
    animalId: row.animal_id as string | null,
    requestedByUserId: row.requested_by_user_id as string,
    serviceId: row.service_id as string | null,
    assignedToUserId: row.assigned_to_user_id as string | null,
    status: row.status as string,
    patientCondition: row.patient_condition as string | null,
    pickupLocation: row.pickup_location as { latitude: number; longitude: number } | null,
    pickupLocationText: row.pickup_location_text as string | null,
    destinationLocation: row.destination_location as { latitude: number; longitude: number } | null,
    destinationLocationText: row.destination_location_text as string | null,
    notes: row.notes as string | null,
    respondedAt: row.responded_at as string | null,
    dispatchedAt: row.dispatched_at as string | null,
    arrivedAt: row.arrived_at as string | null,
    completedAt: row.completed_at as string | null,
    cancelledAt: row.cancelled_at as string | null,
    cancellationReason: row.cancellation_reason as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const isActive = url.searchParams.get("isActive");

    let query = supabaseAdmin().from("ambulance_services").select("*");
    if (city) query = query.ilike("city", city);
    if (isActive !== null) query = query.eq("is_active", isActive === "true");

    const { data, error } = await query.order("name", { ascending: true }).limit(100);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapAmbulanceService), "Ambulance services loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
  if (!isStaff) return badRequest("FORBIDDEN", "Admin access required");

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`ambulance-service-create:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(AmbulanceServiceSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { name, providerType, phone, alternatePhone, vehicleType, capacity, city, location, locationText, isActive } = parsed.data;

    const payload: Record<string, unknown> = {
      name,
      provider_type: providerType,
      phone,
      alternate_phone: alternatePhone ?? null,
      vehicle_type: vehicleType ?? null,
      capacity: capacity ?? null,
      city: city ?? null,
      location_text: locationText ?? null,
      is_active: isActive ?? true,
    };
    if (location) {
      payload.location = `POINT(${location.longitude} ${location.latitude})`;
    }

    const { data, error } = await supabaseAdmin().from("ambulance_services").insert(payload).select("*").single();
    if (error || !data) return serverError(error?.message ?? "Failed to create ambulance service");

    await audit({ tableName: "ambulance_services", recordId: (data as Record<string, unknown>).id as string, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(mapAmbulanceService(data), "Ambulance service created");
  } catch {
    return serverError();
  }
}
