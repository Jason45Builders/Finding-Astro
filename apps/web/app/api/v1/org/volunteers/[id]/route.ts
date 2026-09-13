import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError, badRequest, notFound, forbidden } from "@/lib/api-response";
import { mapVolunteerProfile } from "@/lib/types";

async function getOrgContextForUser(userId: string) {
  const admin = supabaseAdmin();

  const { data: adminRow } = await admin
    .from("welfare_org_admins")
    .select("welfare_group_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminRow) {
    const { data: memberRow } = await admin
      .from("organization_members")
      .select("org_role, permissions")
      .eq("welfare_group_id", adminRow.welfare_group_id)
      .eq("user_id", userId)
      .maybeSingle();

    return {
      welfareGroupId: adminRow.welfare_group_id,
      orgRole: (memberRow?.org_role as string) ?? "org_admin",
      permissions: (memberRow?.permissions as Record<string, boolean>) ?? {},
    };
  }

  const { data: memberRow } = await admin
    .from("organization_members")
    .select("welfare_group_id, org_role, permissions")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (memberRow) {
    return {
      welfareGroupId: memberRow.welfare_group_id,
      orgRole: memberRow.org_role as string,
      permissions: (memberRow.permissions as Record<string, boolean>) ?? {},
    };
  }

  return null;
}

function hasOrgPermission(permissions: Record<string, boolean>, permission: string): boolean {
  if (permissions["*"]) return true;
  return !!permissions[permission];
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const org = await getOrgContextForUser(authResult.user.id);
  if (!org) return NextResponse.json({ success: false, code: "FORBIDDEN", message: "No organization membership" }, { status: 403 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from("volunteer_profiles")
    .select("*")
    .eq("id", id)
    .eq("welfare_group_id", org.welfareGroupId)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!data) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Volunteer not found" }, { status: 404 });

  return ok(mapVolunteerProfile(data), "Volunteer loaded");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const org = await getOrgContextForUser(authResult.user.id);
  if (!org) return NextResponse.json({ success: false, code: "FORBIDDEN", message: "No organization membership" }, { status: 403 });

  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "volunteers:write")) {
    return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("volunteer_profiles")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Volunteer not found" }, { status: 404 });

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
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const org = await getOrgContextForUser(authResult.user.id);
  if (!org) return NextResponse.json({ success: false, code: "FORBIDDEN", message: "No organization membership" }, { status: 403 });

  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "volunteers:write")) {
    return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Insufficient permissions" }, { status: 403 });
  }

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