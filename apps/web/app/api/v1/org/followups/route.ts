import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapPostAdoptionFollowup } from "@/lib/types";

const FOLLOWUP_TYPES = ["adoption_7day", "adoption_30day", "adoption_90day", "medical", "general"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");

    let query = supabaseAdmin()
      .from("post_adoption_followups")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("scheduled_date", { ascending: true });

    if (type && FOLLOWUP_TYPES.includes(type as any)) query = query.eq("followup_type", type);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapPostAdoptionFollowup), "Follow-ups loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "followups:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const type = body.followupType && FOLLOWUP_TYPES.includes(body.followupType) ? body.followupType : "general";

    const { data, error } = await supabaseAdmin()
      .from("post_adoption_followups")
      .insert({
        welfare_group_id: org.welfareGroupId,
        adoption_application_id: body.adoptionApplicationId,
        animal_id: body.animalId,
        adopter_user_id: body.adopterUserId,
        followup_type: type,
        scheduled_date: body.scheduledDate ?? new Date().toISOString(),
        notes: body.notes ?? null,
        status: body.status ?? "scheduled",
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapPostAdoptionFollowup(data), "Follow-up created");
  } catch {
    return serverError();
  }
}