import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const queryText = url.searchParams.get("queryText");
  const status = url.searchParams.get("status");
  const species = url.searchParams.get("species");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  let q = supabaseAdmin.from("animals").select("*");
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
    const body = await req.json();
    const { species, location } = body as Record<string, unknown>;
    if (!species || typeof location !== "object") return badRequest("VALIDATION_ERROR", "species and location are required");

    const payload: Record<string, unknown> = {
      species,
      location: `POINT(${(location as { longitude: number }).longitude} ${(location as { latitude: number }).latitude})`,
      status: (body as { status?: string }).status ?? "community",
      name: (body as { name?: string }).name ?? null,
      breed: (body as { breed?: string }).breed ?? null,
      color: (body as { color?: string }).color ?? null,
      gender: (body as { gender?: string }).gender ?? null,
      approx_age_months: (body as { approxAgeMonths?: number }).approxAgeMonths ?? null,
      description: (body as { description?: string }).description ?? null,
      is_sterilized: (body as { isSterilized?: boolean }).isSterilized ?? false,
      last_seen_text: (body as { lastSeenText?: string }).lastSeenText ?? null,
      territory_label: (body as { territoryLabel?: string }).territoryLabel ?? null,
      primary_photo_url: (body as { primaryPhotoUrl?: string }).primaryPhotoUrl ?? null,
      photo_urls: (body as { photoUrls?: string[] }).photoUrls ?? [],
      Created_by_user_id: authResult.user.id,
    };

    const { data, error } = await supabaseAdmin.from("animals").insert(payload).select("*").single();
    if (error) return serverError(error.message);
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
    const body = await req.json();
    const { latitude, longitude, ...rest } = body as Record<string, unknown>;
    const update: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    if (latitude && longitude) update.location = `POINT(${longitude} ${latitude})`;

    const { data, error } = await supabaseAdmin.from("animals").update(update).eq("id", id).select("*").single();
    if (error) return serverError(error.message);
    return ok(data, "Animal updated");
  } catch {
    return serverError();
  }
}
