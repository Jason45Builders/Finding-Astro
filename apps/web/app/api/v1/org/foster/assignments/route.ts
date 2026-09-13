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
    const { data, error } = await supabaseAdmin()
      .from("foster_assignments")
      .insert({
        welfare_group_id: org.welfareGroupId,
        foster_home_id: body.fosterHomeId,
        animal_id: body.animalId,
        case_id: body.caseId ?? null,
        start_date: body.startDate ?? new Date().toISOString(),
        end_date: body.endDate ?? null,
        status: body.status ?? "pending",
        notes: body.notes ?? null,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapFosterAssignment(data), "Foster assignment created");
  } catch {
    return serverError();
  }
}