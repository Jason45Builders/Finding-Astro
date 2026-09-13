import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden, notFound } from "@/lib/api-response";
import { mapFosterHome } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const available = url.searchParams.get("available");

    let query = supabaseAdmin()
      .from("foster_homes")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (available === "true") query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapFosterHome), "Foster homes loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "foster:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return badRequest("INVALID_BODY", "Name is required");

    const { data, error } = await supabaseAdmin()
      .from("foster_homes")
      .insert({
        welfare_group_id: org.welfareGroupId,
        foster_user_id: body.fosterUserId ?? null,
        name,
        address: body.address ?? null,
        location: body.location ? `SRID=4326;POINT(${body.location.longitude} ${body.location.latitude})` : null,
        capacity: body.capacity ?? 1,
        current_animals_count: body.currentAnimalsCount ?? 0,
        species_accepted: body.speciesAccepted ?? [],
        accepts_special_needs: body.acceptsSpecialNeeds ?? false,
        has_other_animals: body.hasOtherAnimals ?? false,
        has_children: body.hasChildren ?? false,
        experience_years: body.experienceYears ?? 0,
        notes: body.notes ?? null,
        is_active: body.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapFosterHome(data), "Foster home created");
  } catch {
    return serverError();
  }
}