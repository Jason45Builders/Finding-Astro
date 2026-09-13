import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, notFound, forbidden } from "@/lib/api-response";
import { mapVolunteerProfile } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("volunteer_profiles")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Volunteer not found");

    return ok(mapVolunteerProfile(data), "Volunteer loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  if (!hasOrgPermission(org.permissions, "volunteers:write")) {
    return forbidden("Insufficient permissions");
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("volunteer_profiles")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Volunteer not found");

    const allowed: Record<string, unknown> = {};
    if (body.skills !== undefined) allowed.skills = body.skills ?? [];
    if (body.isAvailable !== undefined) allowed.is_available = body.isAvailable;
    if (body.availabilityNotes !== undefined) allowed.availability_notes = body.availabilityNotes ?? null;
    if (body.hasVehicle !== undefined) allowed.has_vehicle = body.hasVehicle;
    if (body.vehicleType !== undefined) allowed.vehicle_type = body.vehicleType ?? null;
    if (body.vehicleCapacity !== undefined) allowed.vehicle_capacity = body.vehicleCapacity ?? null;
    if (body.canFoster !== undefined) allowed.can_foster = body.canFoster;
    if (body.fosterCapacity !== undefined) allowed.foster_capacity = body.fosterCapacity ?? 0;
    if (body.fosterSpeciesAccepted !== undefined) allowed.foster_species_accepted = body.fosterSpeciesAccepted ?? [];
    if (body.canRescue !== undefined) allowed.can_rescue = body.canRescue;
    if (body.canTransport !== undefined) allowed.can_transport = body.canTransport;
    if (body.hasMedicalKnowledge !== undefined) allowed.has_medical_knowledge = body.hasMedicalKnowledge;
    if (body.emergencyContactName !== undefined) allowed.emergency_contact_name = body.emergencyContactName ?? null;
    if (body.emergencyContactPhone !== undefined) allowed.emergency_contact_phone = body.emergencyContactPhone ?? null;
    if (body.notes !== undefined) allowed.notes = body.notes ?? null;

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("volunteer_profiles")
      .update(allowed)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapVolunteerProfile(data), "Volunteer updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  if (!hasOrgPermission(org.permissions, "volunteers:write")) {
    return forbidden("Insufficient permissions");
  }

  const { id } = await params;

  try {
    const { error } = await supabaseAdmin()
      .from("volunteer_profiles")
      .delete()
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId);

    if (error) return serverError(error.message);
    return ok(null, "Volunteer removed");
  } catch {
    return serverError();
  }
}
