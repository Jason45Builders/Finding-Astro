import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody, LocationSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getChannel } from "@/lib/notify-channels";

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

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId");
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);

    let query = supabaseAdmin().from("ambulance_requests").select("*");
    if (caseId) query = query.eq("case_id", caseId);
    if (status) query = query.eq("status", status);

    if (!["admin", "govt", "ngo", "hospital"].includes(authResult.user.role)) {
      query = query.or(`requested_by_user_id.eq.${authResult.user.id},assigned_to_user_id.eq.${authResult.user.id}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapAmbulanceRequest), "Ambulance requests loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`ambulance-request:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(AmbulanceRequestSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { caseId, animalId, serviceId, patientCondition, pickupLocation, pickupLocationText, destinationLocation, destinationLocationText, notes } = parsed.data;

    const payload: Record<string, unknown> = {
      case_id: caseId ?? null,
      animal_id: animalId ?? null,
      requested_by_user_id: authResult.user.id,
      service_id: serviceId ?? null,
      status: "requested",
      patient_condition: patientCondition ?? null,
      pickup_location: `POINT(${pickupLocation.longitude} ${pickupLocation.latitude})`,
      pickup_location_text: pickupLocationText ?? null,
      notes: notes ?? null,
    };
    if (destinationLocation) {
      payload.destination_location = `POINT(${destinationLocation.longitude} ${destinationLocation.latitude})`;
      payload.destination_location_text = destinationLocationText ?? null;
    }

    const { data, error } = await supabaseAdmin().from("ambulance_requests").insert(payload).select("*").single();
    if (error || !data) return serverError(error?.message ?? "Failed to request ambulance");

    await audit({ tableName: "ambulance_requests", recordId: (data as Record<string, unknown>).id as string, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });

    const pickupText = (data as Record<string, unknown>).pickup_location_text as string | null;
    const subject = `New ambulance request${(data as Record<string, unknown>).case_id ? ` for case ${(data as Record<string, unknown>).case_id as string}` : ""}`;
    const body = `A new ambulance request has been created.\n\nPickup: ${pickupText ?? "Location not provided"}\nCondition: ${(parsed.data.patientCondition ?? "Not provided")}\nNotes: ${(parsed.data.notes ?? "None")}\n\nPlease respond if available.`;

    const { data: services } = await supabaseAdmin().from("ambulance_services").select("id, phone, name").eq("is_active", true).limit(20);
    const serviceRows = (services ?? []) as Array<{ id: string; phone: string | null; name: string | null }>;
    if (serviceRows.length > 0) {
      const smsPromises = serviceRows.map((svc) => {
        if (!svc.phone) return Promise.resolve();
        const msg = `Finding Astro: New ambulance request. ${pickupText ?? ""}. Respond in app.`;
        return getChannel("sms").send(svc.phone, subject, msg).catch(() => undefined);
      });
      await Promise.allSettled(smsPromises);
    }

    return ok(mapAmbulanceRequest(data), "Ambulance requested");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`ambulance-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id) return badRequest("BAD_REQUEST", "Ambulance request ID is required");

    const { data: existing, error: fetchError } = await supabaseAdmin().from("ambulance_requests").select("*").eq("id", id).maybeSingle();
    if (fetchError || !existing) return notFound("Ambulance request not found");

    const raw = await req.json();
    const parsed = validateBody(AmbulanceUpdateSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, serviceId, assignedToUserId, patientCondition, notes, cancellationReason } = parsed.data;

    const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
    const isRequester = (existing as Record<string, unknown>).requested_by_user_id === authResult.user.id;
    if (!isStaff && !isRequester) return badRequest("FORBIDDEN", "You can only update your own ambulance requests");

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) {
      update.status = status;
      if (status === "acknowledged") update.responded_at = new Date().toISOString();
      if (status === "dispatched") update.dispatched_at = new Date().toISOString();
      if (status === "arrived") update.arrived_at = new Date().toISOString();
      if (status === "completed") update.completed_at = new Date().toISOString();
      if (status === "cancelled") {
        update.cancelled_at = new Date().toISOString();
        update.cancellation_reason = cancellationReason ?? null;
      }
    }
    if (serviceId !== undefined) update.service_id = serviceId;
    if (assignedToUserId !== undefined) update.assigned_to_user_id = assignedToUserId;
    if (patientCondition !== undefined) update.patient_condition = patientCondition;
    if (notes !== undefined) update.notes = notes;

    const { data, error } = await supabaseAdmin().from("ambulance_requests").update(update).eq("id", id).select("*").single();
    if (error || !data) return serverError(error?.message ?? "Failed to update ambulance request");

    await audit({ tableName: "ambulance_requests", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: existing, newData: data });
    return ok(mapAmbulanceRequest(data), "Ambulance request updated");
  } catch {
    return serverError();
  }
}
