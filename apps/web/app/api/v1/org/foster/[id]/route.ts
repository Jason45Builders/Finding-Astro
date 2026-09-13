import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, notFound, badRequest, forbidden } from "@/lib/api-response";
import { mapFosterHome } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from("foster_homes")
    .select("*")
    .eq("id", id)
    .eq("welfare_group_id", org.welfareGroupId)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!data) return notFound("Foster home not found");
  return ok(mapFosterHome(data), "Foster home loaded");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "foster:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("foster_homes")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Foster home not found");

    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = String(body.name).trim();
    if (body.address !== undefined) allowed.address = body.address ?? null;
    if (body.fosterUserId !== undefined) allowed.foster_user_id = body.fosterUserId ?? null;
    if (body.capacity !== undefined) allowed.capacity = body.capacity;
    if (body.currentAnimalsCount !== undefined) allowed.current_animals_count = body.currentAnimalsCount;
    if (body.speciesAccepted !== undefined) allowed.species_accepted = body.speciesAccepted ?? [];
    if (body.acceptsSpecialNeeds !== undefined) allowed.accepts_special_needs = body.acceptsSpecialNeeds;
    if (body.hasOtherAnimals !== undefined) allowed.has_other_animals = body.hasOtherAnimals;
    if (body.hasChildren !== undefined) allowed.has_children = body.hasChildren;
    if (body.experienceYears !== undefined) allowed.experience_years = body.experienceYears;
    if (body.notes !== undefined) allowed.notes = body.notes ?? null;
    if (body.isActive !== undefined) allowed.is_active = body.isActive;
    if (body.location !== undefined) {
      allowed.location = body.location ? `SRID=4326;POINT(${body.location.longitude} ${body.location.latitude})` : null;
    }

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("foster_homes")
      .update(allowed)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapFosterHome(data), "Foster home updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "foster:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const { error } = await supabaseAdmin()
      .from("foster_homes")
      .delete()
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId);

    if (error) return serverError(error.message);
    return ok(null, "Foster home deleted");
  } catch {
    return serverError();
  }
}