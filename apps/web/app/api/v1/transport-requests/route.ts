import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody, LocationSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

function mapTransportRequest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    animalId: row.animal_id as string | null,
    requestedByUserId: row.requested_by_user_id as string,
    assignedToUserId: row.assigned_to_user_id as string | null,
    vehicleTypeRequired: row.vehicle_type_required as string,
    patientCondition: row.patient_condition as string,
    status: row.status as string,
    slabAmountInr: Number(row.slab_amount_inr ?? 0),
    fundingSource: row.funding_source as string,
    createdAt: row.created_at as string,
  };
}

const TransportUpdateSchema = z.object({
  status: z.enum(["open", "assigned", "completed", "cancelled"]).optional(),
  assignedToUserId: z.string().uuid().optional(),
  cancellationReason: z.string().optional(),
  notes: z.string().optional(),
});

const TransportRequestSchema = z.object({
  caseId: z.string().uuid(),
  animalId: z.string().uuid().optional(),
  vehicleTypeRequired: z.string().min(1),
  patientCondition: z.string().min(1),
  pickupLocation: LocationSchema,
  pickupLocationText: z.string().optional(),
  destinationLocation: LocationSchema,
  destinationLocationText: z.string().optional(),
  slabId: z.string().uuid().optional(),
  slabAmountInr: z.number().nonnegative().optional(),
  fundingSource: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const caseId = url.searchParams.get("caseId");
    const status = url.searchParams.get("status");

    let query = supabaseAdmin().from("transport_requests").select("*");
    if (caseId) query = query.eq("case_id", caseId);
    if (status) query = query.eq("status", status);

    if (!["admin", "govt", "ngo"].includes(authResult.user.role)) {
      query = query.or(`requested_by_user_id.eq.${authResult.user.id},assigned_to_user_id.eq.${authResult.user.id}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapTransportRequest), "Transport requests loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`transport-create:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(TransportRequestSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { caseId, animalId, vehicleTypeRequired, patientCondition, pickupLocation, pickupLocationText, destinationLocation, destinationLocationText, slabId, slabAmountInr, fundingSource } = parsed.data;

    const { data, error } = await supabaseAdmin().from("transport_requests").insert({
      case_id: caseId,
      animal_id: animalId ?? null,
      requested_by_user_id: authResult.user.id,
      vehicle_type_required: vehicleTypeRequired,
      patient_condition: patientCondition,
      pickup_location: `POINT(${pickupLocation.longitude} ${pickupLocation.latitude})`,
      destination_location: `POINT(${destinationLocation.longitude} ${destinationLocation.latitude})`,
      pickup_location_text: pickupLocationText ?? null,
      destination_location_text: destinationLocationText ?? null,
      slab_id: slabId ?? null,
      slab_amount_inr: slabAmountInr ?? 0,
      funding_source: fundingSource ?? "responder",
      status: "open",
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(mapTransportRequest(data), "Transport request created");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`transport-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id) return badRequest("BAD_REQUEST", "Transport request ID is required");

    const { data: existing, error: fetchError } = await supabaseAdmin().from("transport_requests").select("*").eq("id", id).maybeSingle();
    if (fetchError || !existing) return notFound("Transport request not found");

    const raw = await req.json();
    const parsed = validateBody(TransportUpdateSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, assignedToUserId, cancellationReason, notes } = parsed.data;

    const isStaff = ["admin", "govt", "ngo"].includes(authResult.user.role);
    if (!isStaff && existing.requested_by_user_id !== authResult.user.id) {
      return badRequest("FORBIDDEN", "You can only update your own transport requests");
    }

    if (status && existing.status === "completed" && status !== "completed") {
      return badRequest("CONFLICT", "Cannot change status of a completed transport request");
    }

    const update: Record<string, unknown> = {};
    if (status) {
      update.status = status;
      if (status === "completed") update.completed_at = new Date().toISOString();
      if (status === "cancelled") update.cancelled_at = new Date().toISOString();
    }
    if (assignedToUserId && isStaff) {
      update.assigned_to_user_id = assignedToUserId;
      if (!update.assigned_at) update.assigned_at = new Date().toISOString();
    }
    if (cancellationReason && status === "cancelled") {
      update.cancellation_reason = cancellationReason;
    }
    if (notes) update.notes = notes;

    if (Object.keys(update).length === 0) return badRequest("NO_CHANGES", "No valid fields to update");

    const { data, error } = await supabaseAdmin().from("transport_requests").update(update).eq("id", id).select("*").single();
    if (error) return serverError(error.message);

    await audit({ tableName: "transport_requests", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: update });
    return ok(mapTransportRequest(data), "Transport request updated");
  } catch {
    return serverError();
  }
}
