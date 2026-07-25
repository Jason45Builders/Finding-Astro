import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

function mapWildlifeCenter(row: Record<string, unknown>) {
  const lat = row.latitude as number | null;
  const lng = row.longitude as number | null;
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    address: row.address as string | null,
    city: row.city as string | null,
    location: lat !== null && lng !== null ? { latitude: lat, longitude: lng } : null,
    acceptedSpecies: (row.accepted_species as string[]) ?? [],
    operatingHours: row.operating_hours as string | null,
    is24hr: (row.is_24hr as boolean) ?? false,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { data, error } = await supabaseAdmin().from("wildlife_centers").select("*").eq("is_active", true);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapWildlifeCenter), "Wildlife centres loaded");
  } catch {
    return serverError();
  }
}
