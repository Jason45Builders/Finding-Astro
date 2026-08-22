import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimalVaccination } from "@/lib/types";

const CreateVaccinationSchema = z.object({
  vaccineName: z.string().min(1),
  administeredAt: z.string().min(1),
  expiresAt: z.string().optional(),
  batchNumber: z.string().optional(),
  notes: z.string().optional(),
  verified: z.boolean().optional(),
  status: z.enum(["verified", "unverified", "expired"]).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const animalId = url.pathname.replace(/\/api\/v1\/animals\//, "").replace(/\/vaccinations\/?$/, "");
  if (!animalId) return badRequest("VALIDATION_ERROR", "animal id required");

  const { data, error } = await supabaseAdmin()
    .from("vaccinations")
    .select("*")
    .eq("animal_id", animalId)
    .order("administered_at", { ascending: false });

  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapAnimalVaccination), "Vaccinations loaded");
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const privileged = ["admin", "govt", "ngo", "hospital"];
  if (!privileged.includes(authResult.user.role)) {
    return badRequest("FORBIDDEN", "Only staff can create vaccination records");
  }

  try {
    const url = new URL(req.url);
    const animalId = url.pathname.replace(/\/api\/v1\/animals\//, "").replace(/\/vaccinations\/?$/, "");
    if (!animalId) return badRequest("VALIDATION_ERROR", "animal id required");

    const raw = await req.json();
    const parsed = validateBody(CreateVaccinationSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { vaccineName, administeredAt, expiresAt, batchNumber, notes, verified, status } = parsed.data;

    const { data: animal } = await supabaseAdmin().from("animals").select("id").eq("id", animalId).maybeSingle();
    if (!animal) return notFound("Animal not found");

    const { data, error } = await supabaseAdmin().from("vaccinations").insert({
      animal_id: animalId,
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
