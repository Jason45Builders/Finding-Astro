import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { mapAnimalVaccination } from "@/lib/types";

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
