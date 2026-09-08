import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, optionalAuth, requireTier, requireCsrf, AuthenticatedUser } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, unauthorized, notFound } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { fuzzyLocation } from "@/lib/geo";
import { mapAnimal } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const AnimalStatusEnum = z.enum(["community", "lost", "found", "reunited", "adopted"]);
const DisappearanceRiskEnum = z.enum(["stable", "watch", "urgent"]);
const VaccinationStatusEnum = z.enum(["verified", "unverified", "expired"]);

const CreateAnimalSchema = z.object({
  species: z.string().min(1).max(100),
  location: LocationSchema,
  status: AnimalStatusEnum.optional(),
  name: z.string().max(100).optional(),
  breed: z.string().max(100).optional(),
  color: z.string().max(50).optional(),
  gender: z.string().max(20).optional(),
  approxAgeMonths: z.number().int().nonnegative().optional(),
  size: z.string().max(20).optional(),
  temperament: z.string().max(200).optional(),
  distinguishingMarks: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  isSterilized: z.boolean().optional(),
  lastSeenText: z.string().max(500).optional(),
  territoryLabel: z.string().max(200).optional(),
  primaryPhotoUrl: z.string().url().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  visualSignature: z.record(z.unknown()).optional(),
  disappearanceRiskLevel: DisappearanceRiskEnum.optional(),
  vaccinationStatus: VaccinationStatusEnum.optional(),
  adoptableSince: z.string().optional(),
  adoptionNotes: z.string().max(1000).optional(),
  visibility: z.enum(["private", "public_emergency", "public_abc", "public_medical", "public_adoption", "public_general"]).optional(),
  visibilityReason: z.string().max(500).optional(),
  visibilityExpiresAt: z.string().optional(),
});

const UpdateAnimalSchema = CreateAnimalSchema.partial().extend({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const userTier = authResult.user.identityTier ?? 0;

  const url = new URL(req.url);
  const animalId = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  const species = url.searchParams.get("species");
  const queryText = url.searchParams.get("queryText");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  let query = supabaseAdmin().from("animals").select("*");

  if (animalId) query = query.eq("id", animalId);
  if (status) query = query.eq("status", status);
  if (species) query = query.eq("species", species);
  if (queryText) {
    const sanitized = queryText.replace(/[%_]/g, "\\$&");
    query = query.or(`name.ilike.%${sanitized}%,breed.ilike.%${sanitized}%,color.ilike.%${sanitized}%`);
  }

  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
  if (!isStaff && userTier < 2) {
    const sanitizedUserId = authResult.user.id.replace(/[^a-f0-9-]/gi, "");
    query = query.or(`status.eq.community,created_by_user_id.eq.${sanitizedUserId}`);
  }

  const { data, error } = await query.limit(limit);
  if (error) return serverError(error.message);

  let animals = (data ?? []) as Record<string, unknown>[];
  if (!isStaff) {
    const now = new Date().toISOString();
    animals = animals.filter((a) => {
      const visibility = (a.visibility as string) ?? "private";
      if (visibility === "private") {
        return a.created_by_user_id === authResult.user.id;
      }
      if (visibility.startsWith("public_")) {
        const expiresAt = a.visibility_expires_at as string | null;
        return !expiresAt || expiresAt > now;
      }
      return false;
    });
  }

  const fuzzed = animals.map((a) => mapAnimal({ ...a, location: fuzzyLocation(a.location, userTier) }));

  return ok(fuzzed, "Animals loaded", { count: fuzzed.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

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

export async function PATCH(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const url = new URL(req.url);
  const id = url.pathname.replace(/\/api\/v1\/animals\//, "").replace(/\/.*$/, "");
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  const isOwnerOrStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`animal-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const { data, error } = await supabaseAdmin().from("animals").select("created_by_user_id").eq("id", id).maybeSingle();
    if (error) return serverError(error.message);
    const animal = data as Record<string, unknown> | null;
    if (!animal) return notFound("Animal not found");
    const createdBy = animal.created_by_user_id as string | null;
    if (!isOwnerOrStaff && createdBy !== authResult.user.id) {
      return new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "You can only update animals you created" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const raw = await req.json();
    const parsed = validateBody(UpdateAnimalSchema, raw);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const update: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      name: "name", breed: "breed", color: "color", gender: "gender",
      approxAgeMonths: "approx_age_months", size: "size", temperament: "temperament",
      distinguishingMarks: "distinguishing_marks", description: "description",
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

    const { data: updatedAnimal, error: updateError } = await supabaseAdmin().from("animals").update(update).eq("id", id).select("*").single();
    if (updateError) return serverError(updateError.message);
    if (updatedAnimal) {
      await audit({ tableName: "animals", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: updatedAnimal });
      const oldVisibility = (animal as Record<string, unknown>).visibility as string | undefined ?? "private";
      const newVisibility = (updatedAnimal.visibility as string) ?? "private";
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
    return ok(mapAnimal({ ...updatedAnimal, location: fuzzyLocation(updatedAnimal.location, authResult.user.identityTier ?? 0) }), "Animal updated");
  } catch {
    return serverError();
  }
}
