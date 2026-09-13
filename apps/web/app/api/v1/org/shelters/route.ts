import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapShelter } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const { data, error } = await supabaseAdmin()
      .from("shelters")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapShelter), "Shelters loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  if (!hasOrgPermission(org.permissions, "shelters:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return badRequest("INVALID_BODY", "Name is required");

    const { data, error } = await supabaseAdmin()
      .from("shelters")
      .insert({
        welfare_group_id: org.welfareGroupId,
        name,
        location_text: body.locationText ?? null,
        location: body.location ? `SRID=4326;POINT(${body.location.longitude} ${body.location.latitude})` : null,
        total_capacity: body.totalCapacity ?? 0,
        occupied_count: body.occupiedCount ?? 0,
        quarantine_count: body.quarantineCount ?? 0,
        medical_count: body.medicalCount ?? 0,
        adoption_ready_count: body.adoptionReadyCount ?? 0,
        is_active: body.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapShelter(data), "Shelter created");
  } catch {
    return serverError();
  }
}