import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapAbcCampaign } from "@/lib/types";

const CAMPAIGN_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = supabaseAdmin()
      .from("abc_campaigns")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("start_date", { ascending: false });

    if (status && CAMPAIGN_STATUSES.includes(status as any)) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapAbcCampaign), "Campaigns loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "campaigns:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return badRequest("INVALID_BODY", "Title is required");

    const { data, error } = await supabaseAdmin()
      .from("abc_campaigns")
      .insert({
        welfare_group_id: org.welfareGroupId,
        title,
        description: body.description ?? null,
        location_text: body.locationText ?? null,
        location: body.location ? `SRID=4326;POINT(${body.location.longitude} ${body.location.latitude})` : null,
        start_date: body.startDate ?? new Date().toISOString(),
        end_date: body.endDate ?? null,
        target_animals: body.targetAnimals ?? null,
        clinic_name: body.clinicName ?? null,
        vet_name: body.vetName ?? null,
        status: body.status ?? "planned",
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapAbcCampaign(data), "Campaign created");
  } catch {
    return serverError();
  }
}