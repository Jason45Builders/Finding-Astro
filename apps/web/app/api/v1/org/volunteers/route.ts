import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapVolunteerProfile } from "@/lib/types";

const VOLUNTEER_SKILLS = ["rescue", "transport", "foster", "medical", "abc", "adoption", "photography", "legal", "other"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const available = url.searchParams.get("available");
    const skill = url.searchParams.get("skill");

    let query = supabaseAdmin()
      .from("volunteer_profiles")
      .select(`
        *,
        user:users!volunteer_profiles_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (available === "true") query = query.eq("is_available", true);
    if (skill && VOLUNTEER_SKILLS.includes(skill as any)) query = query.contains("skills", [skill]);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapVolunteerProfile), "Volunteers loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "volunteers:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return badRequest("INVALID_BODY", "Email is required");

    const { data: userRow, error: userError } = await supabaseAdmin()
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let targetUserId = userRow?.id;
    let createdPassword: string | null = null;

    if (!targetUserId) {
      createdPassword = crypto.randomUUID().slice(0, 12);
      const passwordHash = await bcrypt.hash(createdPassword, 10);
      const { data: newUser, error: createError } = await supabaseAdmin()
        .from("users")
        .insert({
          email,
          password_hash: passwordHash,
          full_name: email.split("@")[0],
          role: "citizen",
          is_active: true,
        })
        .select("id")
        .single();

      if (createError || !newUser) {
        return serverError("Failed to create account for volunteer");
      }
      targetUserId = newUser.id;
    }

    const { data, error } = await supabaseAdmin()
      .from("volunteer_profiles")
      .upsert({
        welfare_group_id: org.welfareGroupId,
        user_id: targetUserId,
        skills: body.skills ?? [],
        is_available: body.isAvailable ?? true,
        availability_notes: body.availabilityNotes ?? null,
        has_vehicle: body.hasVehicle ?? false,
        vehicle_type: body.vehicleType ?? null,
        vehicle_capacity: body.vehicleCapacity ?? null,
        can_foster: body.canFoster ?? false,
        foster_capacity: body.fosterCapacity ?? 0,
        foster_species_accepted: body.fosterSpeciesAccepted ?? [],
        can_rescue: body.canRescue ?? false,
        can_transport: body.canTransport ?? false,
        has_medical_knowledge: body.hasMedicalKnowledge ?? false,
        emergency_contact_name: body.emergencyContactName ?? null,
        emergency_contact_phone: body.emergencyContactPhone ?? null,
        notes: body.notes ?? null,
      }, { onConflict: "user_id,welfare_group_id" })
      .select(`
        *,
        user:users!volunteer_profiles_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) return serverError(error.message);

    const responsePayload: Record<string, unknown> = { volunteer: mapVolunteerProfile(data) };
    if (createdPassword) {
      responsePayload.tempPassword = createdPassword;
      responsePayload.message = "Account created. Share these credentials with the volunteer.";
    }
    return ok(responsePayload, createdPassword ? "Volunteer added with new account" : "Volunteer profile saved");
  } catch {
    return serverError();
  }
}