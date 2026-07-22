import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody, LocationSchema } from "@/lib/validation";

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
    return ok(data ?? [], "Transport requests loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

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
    return ok(data, "Transport request created");
  } catch {
    return serverError();
  }
}
