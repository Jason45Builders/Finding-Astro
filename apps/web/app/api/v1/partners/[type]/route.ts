import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.pathname.split("/partners/")[1]?.split("/")[0] ?? "";
    const lat = url.searchParams.get("latitude");
    const lng = url.searchParams.get("longitude");
    const radiusKm = parseFloat(url.searchParams.get("radiusKm") ?? "5");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    const tableMap: Record<string, string> = {
      clinics: "partner_clinics",
      stores: "partner_stores",
      "abc-centres": "abc_centres",
      "wildlife-centres": "wildlife_centers",
    };
    const table = tableMap[type];
    if (!table) {
      return NextResponse.json({ success: false, code: "BAD_REQUEST", message: `Unknown partner type: ${type}` }, { status: 400 });
    }

    let query = supabaseAdmin().from(table).select("*").eq("is_verified", true).eq("is_active", true).limit(limit);

    if (type === "clinics" || type === "stores") {
      if (lat && lng) {
        const latF = parseFloat(lat);
        const lngF = parseFloat(lng);
        const { data, error } = await supabaseAdmin().rpc("partners_nearby", { p_lat: latF, p_lng: lngF, p_radius_km: radiusKm, p_type: type === "clinics" ? "clinic" : "store" });
        if (error) return serverError(error.message);
        return ok(data ?? [], `${type} loaded`);
      }
    }

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok(data ?? [], `${type} loaded`, { count: data?.length ?? 0 });
  } catch {
    return serverError();
  }
}
