import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, notFound, badRequest, forbidden } from "@/lib/api-response";
import { mapEvent } from "@/lib/types";

const EVENT_STATUSES = ["planned", "active", "completed", "cancelled"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Event not found");
    return ok(mapEvent(data), "Event loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "events:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Event not found");

    const allowed: Record<string, unknown> = {};
    if (body.title !== undefined) allowed.title = String(body.title).trim();
    if (body.description !== undefined) allowed.description = body.description ?? null;
    if (body.eventType !== undefined) allowed.event_type = body.eventType ?? null;
    if (body.date !== undefined) allowed.date = body.date;
    if (body.locationText !== undefined) allowed.location_text = body.locationText ?? null;
    if (body.location !== undefined) {
      allowed.location = body.location ? `SRID=4326;POINT(${body.location.longitude} ${body.location.latitude})` : null;
    }
    if (body.capacity !== undefined) allowed.capacity = body.capacity ?? null;
    if (body.registrationsCount !== undefined) allowed.registrations_count = body.registrationsCount;
    if (body.status && EVENT_STATUSES.includes(body.status)) allowed.status = body.status;

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("events")
      .update(allowed)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapEvent(data), "Event updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "events:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const { error } = await supabaseAdmin()
      .from("events")
      .delete()
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId);

    if (error) return serverError(error.message);
    return ok(null, "Event deleted");
  } catch {
    return serverError();
  }
}