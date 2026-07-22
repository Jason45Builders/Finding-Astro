import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const AnimalStatusEnum = z.enum(["community", "lost", "found", "reunited", "adopted"]);
const DisappearanceRiskEnum = z.enum(["stable", "watch", "urgent"]);
const VaccinationStatusEnum = z.enum(["verified", "unverified", "expired"]);

const CreateAnimalSchema = z.object({
  species: z.string().min(1),
  location: LocationSchema,
  status: AnimalStatusEnum.optional(),
  name: z.string().optional(),
  breed: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  approxAgeMonths: z.number().int().nonnegative().optional(),
  size: z.string().optional(),
  temperament: z.string().optional(),
  distinguishingMarks: z.string().optional(),
  description: z.string().optional(),
  isSterilized: z.boolean().optional(),
  lastSeenText: z.string().optional(),
  territoryLabel: z.string().optional(),
  primaryPhotoUrl: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  visualSignature: z.record(z.unknown()).optional(),
  disappearanceRiskLevel: DisappearanceRiskEnum.optional(),
  vaccinationStatus: VaccinationStatusEnum.optional(),
  adoptableSince: z.string().optional(),
  adoptionNotes: z.string().optional(),
});

const UpdateAnimalSchema = CreateAnimalSchema.partial().extend({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryText = url.searchParams.get("queryText");
  const status = url.searchParams.get("status");
  const species = url.searchParams.get("species");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  let q = supabaseAdmin().from("animals").select("*");
  if (status) q = q.eq("status", status);
  if (species) q = q.eq("species", species);
  if (queryText) q = q.or(`name.ilike.%${queryText}%,breed.ilike.%${queryText}%`);
  const { data, error } = await q.limit(limit);
  if (error) return serverError(error.message);
  return ok(data ?? [], "Animals loaded", { count: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(CreateAnimalSchema, raw);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const payload: Record<string, unknown> = {
      species: body.species,
      location: `POINT(${body.location.longitude} ${body.location.latitude})`,
      status: body.status ?? "community",
      name: body.name ?? null,
      breed: body.breed ?? null,
      color: body.color ?? null,
      gender: body.gender ?? null,
      approx_age_months: body.approxAgeMonths ?? null,
      description: body.description ?? null,
      is_sterilized: body.isSterilized ?? false,
      last_seen_text: body.lastSeenText ?? null,
      territory_label: body.territoryLabel ?? null,
      primary_photo_url: body.primaryPhotoUrl ?? null,
      photo_urls: body.photoUrls ?? [],
      visual_signature: body.visualSignature ?? {},
      disappearance_risk_level: body.disappearanceRiskLevel ?? "stable",
      vaccination_status: body.vaccinationStatus ?? "unverified",
      created_by_user_id: authResult.user.id,
      adoptable_since: body.adoptableSince ?? null,
      adoption_notes: body.adoptionNotes ?? null,
      size: body.size ?? null,
      temperament: body.temperament ?? null,
      distinguishing_marks: body.distinguishingMarks ?? null,
    };

    const { data, error } = await supabaseAdmin().from("animals").insert(payload).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "animals", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(data, "Animal record created");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const url = new URL(req.url);
  const id = url.pathname.replace(/\/api\/v1\/animals\//, "").replace(/\/.*$/, "");
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  try {
    const raw = await req.json();
    const parsed = validateBody(UpdateAnimalSchema, raw);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const update: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      name: "name", breed: "breed", color: "color", gender: "gender",
      approxAgeMonths: "approx_age_months", description: "description",
      isSterilized: "is_sterilized", lastSeenText: "last_seen_text",
      territoryLabel: "territory_label", primaryPhotoUrl: "primary_photo_url",
      photoUrls: "photo_urls", visualSignature: "visual_signature",
      disappearanceRiskLevel: "disappearance_risk_level",
      vaccinationStatus: "vaccination_status", adoptableSince: "adoptable_since",
      adoptionNotes: "adoption_notes", status: "status",
    };
    for (const [src, dst] of Object.entries(fieldMap)) {
      if ((body as Record<string, unknown>)[src] !== undefined) {
        update[dst] = (body as Record<string, unknown>)[src];
      }
    }
    if (body.latitude && body.longitude) {
      update.location = `POINT(${body.longitude} ${body.latitude})`;
    }
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin().from("animals").update(update).eq("id", id).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "animals", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(data, "Animal updated");
  } catch {
    return serverError();
  }
}
