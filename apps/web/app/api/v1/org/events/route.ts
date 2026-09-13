import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapEvent } from "@/lib/types";

const EVENT_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    let query = supabaseAdmin()
      .from("events")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("date", { ascending: true })
      .limit(limit);

    if (status && EVENT_STATUSES.includes(status as any)) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapEvent), "Events loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "events:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return badRequest("INVALID_BODY", "Title is required");

    const status = body.status && EVENT_STATUSES.includes(body.status) ? body.status : "planned";

    const { data, error } = await supabaseAdmin()
      .from("events")
      .insert({
        welfare_group_id: org.welfareGroupId,
        title,
        description: body.description ?? null,
        event_type: body.eventType ?? null,
        date: body.date ?? new Date().toISOString(),
        location_text: body.locationText ?? null,
        location: body.location ? `SRID=4326;POINT(${body.location.longitude} ${body.location.latitude})` : null,
        capacity: body.capacity ?? null,
        registrations_count: body.registrationsCount ?? 0,
        status,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapEvent(data), "Event created");
  } catch {
    return serverError();
  }
}