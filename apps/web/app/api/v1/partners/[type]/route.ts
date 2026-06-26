import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type: routeType } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? routeType;
  const lat = url.searchParams.get("latitude");
  const lng = url.searchParams.get("longitude");
  const radiusKm = parseFloat(url.searchParams.get("radiusKm") ?? "5");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

  let query = supabaseAdmin.from("partners").select("*");

  const typeMap: Record<string, string> = {
    clinics: "clinic",
    "abc-centres": "abc_centre",
    stores: "store",
    "welfare-orgs": "ngo",
    helplines: "helpline",
    "wildlife-centres": "wildlife_centre",
  };
  const dbType = typeMap[type] ?? type;

  query = query.eq("type", dbType).limit(limit);
  if (type !== "helplines") query = query.eq("verification_status", "approved");
  if (lat && lng) {
    const latF = parseFloat(lat), lngF = parseFloat(lng);
    const { data, error } = await supabaseAdmin.rpc("partners_nearby", { p_lat: latF, p_lng: lngF, p_radius_km: radiusKm, p_type: dbType });
    if (error) return serverError(error.message);
    return ok(data ?? [], `${type} loaded`);
  }
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok(data ?? [], `${type} loaded`, { count: data?.length ?? 0 });
}
