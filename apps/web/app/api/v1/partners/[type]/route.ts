import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";
import { mapPartner } from "@/lib/types";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
    const singularType: Record<string, string> = {
      clinics: "clinic", stores: "store", "abc-centres": "abc_centre", "wildlife-centres": "wildlife_centre",
    };

    const query = supabaseAdmin().from(table).select("*").eq("is_verified", true).eq("is_active", true).limit(limit);
    const { data, error } = await query;
    if (error) return serverError(error.message);
    let rows = (data ?? []) as Record<string, unknown>[];

    if ((type === "clinics" || type === "stores") && lat && lng) {
      const latF = parseFloat(lat);
      const lngF = parseFloat(lng);
      rows = rows
        .map((row) => ({ row, distanceKm: haversineKm(latF, lngF, Number(row.latitude), Number(row.longitude)) }))
        .filter((r) => r.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map((r) => ({ ...r.row, __distanceKm: r.distanceKm }));
    }

    const mapped = rows.map((row) => {
      const partner = mapPartner(row, singularType[type]);
      if (row.__distanceKm !== undefined) partner.distanceKm = Math.round((row.__distanceKm as number) * 10) / 10;
      return partner;
    });
    return ok(mapped, `${type} loaded`, { count: mapped.length });
  } catch {
    return serverError();
  }
}
