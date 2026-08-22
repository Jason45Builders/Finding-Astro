import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound, conflict } from "@/lib/api-response";
import { validateBody, LocationSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { decodeLocation } from "@/lib/geo";
import { mapAbcEvent } from "@/lib/types";

const AbcRequestSchema = z.object({
  animalId: z.string().uuid(),
  notes: z.string().optional(),
  location: LocationSchema.optional(),
});

const AbcEventSchema = z.object({
  animalId: z.string().uuid(),
  eventType: z.enum(["capture", "surgery", "return"]),
  notes: z.string().optional(),
  location: LocationSchema.optional(),
  attachments: z.array(z.string().url()).optional(),
});

const ABC_STATE_MACHINE: Record<string, string[]> = {
  request: ["capture"],
  capture: ["surgery"],
  surgery: ["return"],
  return: [],
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const animalId = url.searchParams.get("animalId");
  if (animalId) {
    const { data, error } = await supabaseAdmin().from("abc_events").select("*").eq("animal_id", animalId).order("created_at", { ascending: false });
    if (error) return serverError(error.message);
    return ok((data ?? []).map((row) => mapAbcEvent({ ...row, location: decodeLocation(row.location) })), "ABC events loaded");
  }
  const { data, error } = await supabaseAdmin().from("abc_events").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) return serverError(error.message);
  return ok((data ?? []).map((row) => mapAbcEvent({ ...row, location: decodeLocation(row.location) })), "ABC tracking loaded");
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*abc\//, "");
    const raw = await req.json();
    const user = authResult.user;

    if (action === "requests") {
      const parsed = validateBody(AbcRequestSchema, raw);
      if (!parsed.ok) return parsed.response;
      const { animalId, notes, location } = parsed.data;

      const { data: existing } = await supabaseAdmin().from("abc_events").select("id, event_type, status").eq("animal_id", animalId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing && ["request", "capture", "surgery"].includes(existing.event_type) && existing.status !== "returned") {
        return conflict("This animal already has an active ABC flow. Complete the current flow before starting a new one.");
      }

      const { data: animal } = await supabaseAdmin().from("animals").select("id, name, status").eq("id", animalId).maybeSingle();
      if (!animal) return notFound("Animal not found");

      const { data: abcEvent, error: abcError } = await supabaseAdmin().from("abc_events").insert({
        animal_id: animalId,
        requested_by_user_id: user.id,
        event_type: "request",
        status: "open",
        notes: notes ?? null,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        geo_validated: false,
        unreturned_alert: true,
      }).select("*").single();

      if (abcError) return serverError(abcError.message);

      const casePayload: Record<string, unknown> = {
        case_type: "abc",
        status: "open",
        priority: "medium",
        title: `ABC request — ${animal.name ?? "Animal"}`,
        description: notes ?? `ABC request for animal ${animalId}`,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : "POINT(0 0)",
        reporter_user_id: user.id,
        animal_id: animalId,
        evidence_urls: [],
      };
      if (location?.latitude && location?.longitude) {
        casePayload.location = `POINT(${location.longitude} ${location.latitude})`;
      }
      const { data: caseRecord, error: caseError } = await supabaseAdmin().from("cases").insert(casePayload).select("*").single();
      if (caseError) {
        await supabaseAdmin().from("abc_events").delete().eq("id", abcEvent.id);
        return serverError(caseError.message);
      }

      await supabaseAdmin().from("abc_events").update({ case_id: caseRecord.id }).eq("id", abcEvent.id);
      await audit({ tableName: "abc_events", recordId: abcEvent.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: { ...abcEvent, case_id: caseRecord.id } });
      await audit({ tableName: "cases", recordId: caseRecord.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: caseRecord });

      return ok(mapAbcEvent({ ...abcEvent, location: decodeLocation(abcEvent.location), case_id: caseRecord.id }), "ABC request created");
    }

    if (action === "events") {
      const parsed = validateBody(AbcEventSchema, raw);
      if (!parsed.ok) return parsed.response;
      const { animalId, eventType, notes, location, attachments } = parsed.data;

      const { data: previous } = await supabaseAdmin().from("abc_events").select("event_type, status, case_id").eq("animal_id", animalId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!previous) return badRequest("NO_ABC_FLOW", "No active ABC request found for this animal. Create an ABC request first.");

      const allowedNext = ABC_STATE_MACHINE[previous.event_type] ?? [];
      if (!allowedNext.includes(eventType)) {
        return badRequest("INVALID_TRANSITION", `Cannot transition from ${previous.event_type} to ${eventType}. Valid next step: ${allowedNext.join(", ") || "none (flow complete)"}`);
      }

      const { data: abcEvent, error: abcError } = await supabaseAdmin().from("abc_events").insert({
        animal_id: animalId,
        case_id: previous.case_id ?? null,
        requested_by_user_id: user.id,
        event_type: eventType,
        status: "open",
        notes: notes ?? null,
        location: location ? `POINT(${location.longitude} ${location.latitude})` : null,
        geo_validated: !!location,
        unreturned_alert: false,
      }).select("*").single();

      if (abcError) return serverError(abcError.message);

      if (eventType === "surgery") {
        await supabaseAdmin().from("animals").update({ is_sterilized: true, updated_at: new Date().toISOString() }).eq("id", animalId);
      }

      if (eventType === "return" && previous.case_id) {
        await supabaseAdmin().from("abc_events").update({ status: "returned", unreturned_alert: false }).eq("animal_id", animalId).neq("id", abcEvent.id);
        await supabaseAdmin().from("animals").update({ status: "community", updated_at: new Date().toISOString() }).eq("id", animalId);
      }

      if (attachments && attachments.length > 0) {
        await supabaseAdmin().from("medical_history").insert({
          animal_id: animalId,
          case_id: previous.case_id ?? null,
          abc_event_id: abcEvent.id,
          created_by_user_id: user.id,
          entry_type: eventType === "surgery" ? "surgery" : "observation",
          title: `ABC ${eventType}`,
          notes: notes ?? null,
          provider_name: null,
          treatment_date: new Date().toISOString(),
          cost_amount: null,
          attachments,
        });
      }

      await audit({ tableName: "abc_events", recordId: abcEvent.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: abcEvent });
      return ok(mapAbcEvent({ ...abcEvent, location: decodeLocation(abcEvent.location) }), `ABC ${eventType} logged`);
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
