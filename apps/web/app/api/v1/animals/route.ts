import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const animalId = url.searchParams.get("id");
  const status = url.searchParams.get("status");
  const species = url.searchParams.get("species");
  const queryText = url.searchParams.get("queryText");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  let query = supabaseAdmin.from("animals").select("*");

  if (animalId) query = query.eq("id", animalId);
  if (status) query = query.eq("status", status);
  if (species) query = query.eq("species", species);
  if (queryText) query = query.or(`name.ilike.%${queryText}%,breed.ilike.%${queryText}%,color.ilike.%${queryText}%`);

  const { data, error } = await query.limit(limit);
  if (error) return serverError(error.message);
  return ok(data ?? [], "Animals loaded", { count: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const requiredFields = ["species", "location"];
    for (const f of requiredFields) {
      if (!(f in body)) return badRequest("VALIDATION_ERROR", `${f} is required`);
    }

    const payload: Record<string, unknown> = {
      species: body.species,
      location: body.location,
      status: body.status ?? "community",
      name: body.name ?? null,
      breed: body.breed ?? null,
      color: body.color ?? null,
      gender: body.gender ?? null,
      approx_age_months: body.approxAgeMonths ?? null,
      size: body.size ?? null,
      temperament: body.temperament ?? null,
      distinguishing_marks: body.distinguishingMarks ?? null,
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
    };

    const { data, error } = await supabaseAdmin.from("animals").insert(payload).select("*").single();
    if (error) return serverError(error.message);
    return ok(data, "Animal record created");
  } catch {
    return serverError();
  }
}
