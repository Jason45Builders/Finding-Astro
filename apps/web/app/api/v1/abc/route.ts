import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const animalId = url.searchParams.get("animalId");
  if (animalId) {
    const { data, error } = await supabaseAdmin.from("abc_events").select("*").eq("animal_id", animalId).order("created_at", { ascending: false });
    if (error) return serverError(error.message);
    return ok(data ?? [], "ABC events loaded");
  }
  const { data, error } = await supabaseAdmin.from("abc_events").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) return serverError(error.message);
  return ok(data ?? [], "ABC tracking loaded");
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*abc\//, "");
    const body = await req.json();
    const user = authResult.user;

    if (action === "requests") {
      const { animalId, notes, location, eventType } = body as Record<string, unknown>;
      const event = eventType ?? "request";

      const { data, error } = await supabaseAdmin.from("abc_events").insert({
        animal_id: animalId ?? null,
        requested_by_user_id: user.id,
        event_type: event,
        status: "pending",
        notes: notes ?? null,
        location: location ? `POINT(${(location as { longitude: number }).longitude} ${(location as { latitude: number }).latitude})` : null,
        geo_validated: false,
        unreturned_alert: event === "request",
      }).select("*").single();

      if (error) return serverError(error.message);
      return ok(data, "ABC request created");
    }

    if (action === "events") {
      const { animalId, eventType, status, notes, location } = body as Record<string, unknown>;
      const { data, error } = await supabaseAdmin.from("abc_events").insert({
        animal_id: animalId,
        event_type: eventType,
        status: status ?? "pending",
        notes: notes ?? null,
        location: location ? `POINT(${(location as { longitude: number }).longitude} ${(location as { latitude: number }).latitude})` : null,
        requested_by_user_id: user.id,
      }).select("*").single();

      if (error) return serverError(error.message);
      return ok(data, "ABC event logged");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
