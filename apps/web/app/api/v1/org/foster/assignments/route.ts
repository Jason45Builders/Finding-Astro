import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapFosterAssignment } from "@/lib/types";

const FOSTER_STATUSES = ["pending", "active", "completed", "returned"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const fosterHomeId = url.searchParams.get("fosterHomeId");
    const animalId = url.searchParams.get("animalId");
    const status = url.searchParams.get("status");

    let query = supabaseAdmin()
      .from("foster_assignments")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("start_date", { ascending: false });

    if (fosterHomeId) query = query.eq("foster_home_id", fosterHomeId);
    if (animalId) query = query.eq("animal_id", animalId);
    if (status && FOSTER_STATUSES.includes(status as any)) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapFosterAssignment), "Foster assignments loaded");
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
    const [fosterHomeRes, animalRes, caseRes] = await Promise.all([
      supabaseAdmin().from("foster_homes").select("*").eq("id", body.fosterHomeId).eq("welfare_group_id", org.welfareGroupId).maybeSingle(),
      supabaseAdmin().from("animals").select("id,species,status").eq("id", body.animalId).eq("welfare_group_id", org.welfareGroupId).maybeSingle(),
      body.caseId
        ? supabaseAdmin().from("cases").select("id").eq("id", body.caseId).eq("welfare_group_id", org.welfareGroupId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (fosterHomeRes.error) return serverError(fosterHomeRes.error.message);
    if (animalRes.error) return serverError(animalRes.error.message);
    if (caseRes.error) return serverError(caseRes.error.message);
    if (!fosterHomeRes.data || !animalRes.data || (body.caseId && !caseRes.data)) return badRequest("INVALID_DEPENDENCY", "Foster home, animal, and case must belong to this organization");
    const home = fosterHomeRes.data;
    const animal = animalRes.data;
    const status = body.status ?? "pending";
    if (!FOSTER_STATUSES.includes(status as any) || !["pending", "active"].includes(status)) return badRequest("INVALID_STATUS", "New assignments must start as pending or active");
    if (!home.is_active) return badRequest("INACTIVE_HOME", "Choose an active foster home");
    if (["adopted", "reunited"].includes(animal.status)) return badRequest("ANIMAL_UNAVAILABLE", "Adopted or reunited animals cannot be assigned to foster care");
    if (home.species_accepted?.length && !home.species_accepted.includes(animal.species)) return badRequest("SPECIES_MISMATCH", "This foster home does not accept this species");
    if (status === "active" && home.current_animals_count >= home.capacity) return badRequest("CAPACITY_REACHED", "This foster home has reached capacity");
    const { data: existing, error: existingError } = await supabaseAdmin().from("foster_assignments").select("id").eq("animal_id", body.animalId).in("status", ["pending", "active"]).maybeSingle();
    if (existingError) return serverError(existingError.message);
    if (existing) return badRequest("ALREADY_ASSIGNED", "This animal already has an open foster assignment");

    const { data, error } = await supabaseAdmin()
      .from("foster_assignments")
      .insert({
        welfare_group_id: org.welfareGroupId,
        foster_home_id: body.fosterHomeId,
        animal_id: body.animalId,
        case_id: body.caseId ?? null,
        start_date: body.startDate ?? new Date().toISOString(),
        end_date: body.endDate ?? null,
        status,
        notes: body.notes ?? null,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    if (status === "active") {
      const { error: countError } = await supabaseAdmin().from("foster_homes").update({ current_animals_count: home.current_animals_count + 1 }).eq("id", home.id).eq("welfare_group_id", org.welfareGroupId);
      if (countError) return serverError(countError.message);
    }
    return ok(mapFosterAssignment(data), "Foster assignment created");
  } catch {
    return serverError();
  }
}