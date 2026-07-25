import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { decodeLocation } from "@/lib/geo";

function mapSafeZone(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    zoneName: row.zone_name as string,
    wardName: row.ward_name as string | null,
    zoneType: row.zone_type as string | null,
    location: decodeLocation(row.location),
    radiusMetres: row.radius_metres as number,
    animalCount: row.animal_count as number,
    abcCoveragePct: row.abc_coverage_pct as number,
    vaccinationPct: row.vaccination_pct as number,
    isActive: row.is_active as boolean,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { data, error } = await supabaseAdmin().from("safe_awareness_zones").select("*").eq("is_active", true);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapSafeZone), "Zones loaded");
  } catch {
    return serverError();
  }
}
