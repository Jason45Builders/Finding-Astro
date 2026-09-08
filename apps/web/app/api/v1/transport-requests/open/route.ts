import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
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

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`transport-open:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const vehicleType = url.searchParams.get("vehicle_type");

    let query = supabaseAdmin().from("transport_requests").select("*").eq("status", "open");
    if (vehicleType) query = query.eq("vehicle_type_required", vehicleType);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapTransportRequest), "Open transport requests loaded");
  } catch {
    return serverError();
  }
}
