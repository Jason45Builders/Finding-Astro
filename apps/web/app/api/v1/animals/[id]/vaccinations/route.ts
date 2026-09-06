import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimalVaccination } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const CreateVaccinationSchema = z.object({
  vaccineName: z.string().min(1),
  administeredAt: z.string().min(1),
  expiresAt: z.string().optional(),
  batchNumber: z.string().optional(),
  notes: z.string().optional(),
  verified: z.boolean().optional(),
  status: z.enum(["verified", "unverified", "expired"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  const { data, error } = await supabaseAdmin()
    .from("vaccinations")
    .select("*")
    .eq("animal_id", id)
    .order("administered_at", { ascending: false });

  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapAnimalVaccination), "Vaccinations loaded");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`vaccination:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const privileged = ["admin", "govt", "ngo", "hospital"];
  if (!privileged.includes(authResult.user.role)) {
    return badRequest("FORBIDDEN", "Only staff can create vaccination records");
  }

  try {
    const { id } = await params;
    if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

    const raw = await req.json();
    const parsed = validateBody(CreateVaccinationSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { vaccineName, administeredAt, expiresAt, batchNumber, notes, verified, status } = parsed.data;

    const { data: animal } = await supabaseAdmin().from("animals").select("id").eq("id", id).maybeSingle();
    if (!animal) return notFound("Animal not found");

    const { data, error } = await supabaseAdmin().from("vaccinations").insert({
      animal_id: id,
      vaccine_name: vaccineName,
      administered_at: administeredAt,
      expires_at: expiresAt ?? null,
      batch_number: batchNumber ?? null,
      notes: notes ?? null,
      verified: verified ?? false,
      status: status ?? "unverified",
      administered_by_user_id: authResult.user.id,
    }).select("*").single();

    if (error) return serverError(error.message);

    await audit({ tableName: "vaccinations", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(mapAnimalVaccination(data), "Vaccination record created");
  } catch {
    return serverError();
  }
}
