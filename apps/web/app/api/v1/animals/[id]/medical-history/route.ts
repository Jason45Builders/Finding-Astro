import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimalMedicalRecord } from "@/lib/types";

const CreateMedicalRecordSchema = z.object({
  entryType: z.enum(["treatment", "vaccination", "surgery", "observation"]),
  title: z.string().min(1),
  notes: z.string().optional(),
  providerName: z.string().optional(),
  treatmentDate: z.string().min(1),
  costAmount: z.number().nonnegative().optional(),
  caseId: z.string().uuid().optional(),
  abcEventId: z.string().uuid().optional(),
  attachments: z.array(z.string().url()).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const animalId = url.pathname.replace(/\/api\/v1\/animals\//, "").replace(/\/medical-history\/?$/, "");
  if (!animalId) return badRequest("VALIDATION_ERROR", "animal id required");

  const { data, error } = await supabaseAdmin()
    .from("medical_history")
    .select("*")
    .eq("animal_id", animalId)
    .order("treatment_date", { ascending: false });

  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapAnimalMedicalRecord), "Medical history loaded");
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const privileged = ["admin", "govt", "ngo", "hospital"];
  if (!privileged.includes(authResult.user.role)) {
    return badRequest("FORBIDDEN", "Only staff can create medical records");
  }

  try {
    const url = new URL(req.url);
    const animalId = url.pathname.replace(/\/api\/v1\/animals\//, "").replace(/\/medical-history\/?$/, "");
    if (!animalId) return badRequest("VALIDATION_ERROR", "animal id required");

    const raw = await req.json();
    const parsed = validateBody(CreateMedicalRecordSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { entryType, title, notes, providerName, treatmentDate, costAmount, caseId, abcEventId, attachments } = parsed.data;

    const { data: animal } = await supabaseAdmin().from("animals").select("id").eq("id", animalId).maybeSingle();
    if (!animal) return notFound("Animal not found");

    const insertPayload: Record<string, unknown> = {
      animal_id: animalId,
      entry_type: entryType,
      title,
      notes: notes ?? null,
      provider_name: providerName ?? null,
      treatment_date: treatmentDate,
      cost_amount: costAmount ?? null,
      created_by_user_id: authResult.user.id,
      attachments: attachments ?? [],
    };
    if (caseId) insertPayload.case_id = caseId;
    if (abcEventId) insertPayload.abc_event_id = abcEventId;

    const { data, error } = await supabaseAdmin().from("medical_history").insert(insertPayload).select("*").single();
    if (error) return serverError(error.message);

    await audit({ tableName: "medical_history", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(mapAnimalMedicalRecord(data), "Medical record created");
  } catch {
    return serverError();
  }
}
