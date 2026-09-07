import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound, forbidden } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { fuzzyLocation } from "@/lib/geo";
import { mapAnimal } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

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
  visibility: z.enum(["private", "public_emergency", "public_abc", "public_medical", "public_adoption", "public_general"]).optional(),
  visibilityReason: z.string().max(500).optional(),
  visibilityExpiresAt: z.string().optional(),
});

const UpdateAnimalSchema = CreateAnimalSchema.partial().extend({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const userTier = authResult.user.identityTier ?? 0;

  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  const { data, error } = await supabaseAdmin().from("animals").select("*").eq("id", id).single();
  if (error) return notFound("Animal not found");

  const animal = data as Record<string, unknown>;
  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
  const visibility = (animal.visibility as string) ?? "private";
  const createdBy = animal.created_by_user_id as string | null;

  if (!isStaff && visibility === "private" && createdBy !== authResult.user.id) {
    return forbidden("This animal record is private");
  }

  if (!isStaff && visibility.startsWith("public_")) {
    const expiresAt = animal.visibility_expires_at as string | null;
    if (expiresAt && expiresAt <= new Date().toISOString()) {
      return forbidden("This animal record is no longer publicly visible");
    }
  }

  return ok(mapAnimal({ ...animal, location: fuzzyLocation(animal.location, userTier) }), "Animal loaded");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`animal-create:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

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
      visibility: body.visibility ?? "private",
      visibility_reason: body.visibilityReason ?? null,
      visibility_expires_at: body.visibilityExpiresAt ?? null,
      visibility_changed_by: authResult.user.id,
      visibility_changed_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin().from("animals").insert(payload).select("*").single();
    if (error) return serverError(error.message);
    if (data) {
      await audit({ tableName: "animals", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
      await supabaseAdmin().from("animal_visibility_audit").insert({
        animal_id: data.id,
        actor_id: authResult.user.id,
        actor_role: authResult.user.role,
        old_visibility: "private",
        new_visibility: (data.visibility as string) ?? "private",
        reason: body.visibilityReason ?? null,
      });
    }
    return ok(mapAnimal({ ...data, location: fuzzyLocation(data.location, authResult.user.identityTier ?? 0) }), "Animal record created");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const url = new URL(req.url);
  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`animal-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const { data: existing, error: fetchError } = await supabaseAdmin().from("animals").select("created_by_user_id").eq("id", id).single();
    if (fetchError || !existing) return notFound("Animal not found");

    const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
    const isOwner = (existing as Record<string, unknown>).created_by_user_id === authResult.user.id;
    if (!isStaff && !isOwner) return badRequest("FORBIDDEN", "You can only update animals you created");

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
      visibility: "visibility", visibilityReason: "visibility_reason", visibilityExpiresAt: "visibility_expires_at",
    };
    for (const [src, dst] of Object.entries(fieldMap)) {
      if ((body as Record<string, unknown>)[src] !== undefined) {
        update[dst] = (body as Record<string, unknown>)[src];
      }
    }
    if (body.latitude && body.longitude) {
      update.location = `POINT(${body.longitude} ${body.latitude})`;
    }
    if ((body as Record<string, unknown>).visibility !== undefined) {
      update.visibility_changed_by = authResult.user.id;
      update.visibility_changed_at = new Date().toISOString();
    }
    update.updated_at = new Date().toISOString();

    const { data: updateData, error: updateError } = await supabaseAdmin().from("animals").update(update).eq("id", id).select("*").single();
    if (updateError) return serverError(updateError.message);
    if (updateData) {
      await audit({ tableName: "animals", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: updateData });
      const oldVisibility = (existing as Record<string, unknown>).visibility as string | undefined ?? "private";
      const newVisibility = (updateData.visibility as string) ?? "private";
      if (oldVisibility !== newVisibility) {
        await supabaseAdmin().from("animal_visibility_audit").insert({
          animal_id: id,
          actor_id: authResult.user.id,
          actor_role: authResult.user.role,
          old_visibility: oldVisibility,
          new_visibility: newVisibility,
          reason: ((body as Record<string, unknown>).visibilityReason as string | null) ?? null,
        });
      }
    }
    return ok(mapAnimal({ ...updateData, location: fuzzyLocation(updateData.location, authResult.user.identityTier ?? 0) }), "Animal updated");
  } catch {
    return serverError();
  }
}
