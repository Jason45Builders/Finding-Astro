import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { decodeLocation } from "@/lib/geo";
import { mapSafetyReport, mapBehaviourGuidanceCard } from "@/lib/types";

const URGENT_SITUATION_TYPES = new Set(["bite_incident", "child_safety"]);

const HUMANE_RESPONSES: Record<string, string> = {
  feel_unsafe: "Thank you for reporting this. Avoid direct eye contact or running, and give the animals space while you move to safety. A welfare volunteer will review this area for feeding-point or containment follow-up.",
  aggression_concern: "This has been logged for a welfare volunteer to assess the animal's condition and territory. If the aggression continues or escalates, call your local animal control helpline directly rather than intervening.",
  bite_incident: "If someone was bitten, please seek medical attention immediately and wash the wound with soap and running water for several minutes. This report has been flagged as high priority so the animal can be identified and observed for rabies risk.",
  pack_concern: "Thank you for flagging this. Group behaviour in strays is often linked to a nearby feeding point, breeding season, or territorial dispute - a volunteer will assess the area rather than relocating the animals, which can worsen conflict.",
  child_safety: "This has been marked high priority. Please keep children at a safe distance from the animals until a volunteer follows up, and avoid letting children run, scream, or reach toward the animals, which can trigger defensive behaviour.",
};

const DEFAULT_HUMANE_RESPONSE = "Thank you for reporting this. A welfare volunteer will review the situation and follow up. Please avoid intervening directly with the animal(s) in the meantime.";

const SafetyReportSchema = z.object({
  situationType: z.string().min(1),
  description: z.string().min(1),
  location: LocationSchema,
  locationText: z.string().optional(),
  severity: z.string().optional(),
  animalId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(SafetyReportSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { situationType, description, location: loc, locationText, severity, animalId } = parsed.data;
    const isUrgent = URGENT_SITUATION_TYPES.has(situationType);
    const effectiveSeverity = isUrgent ? "high" : (severity ?? "medium");

    const { data: guidanceRows } = await supabaseAdmin().from("behaviour_guidance_cards").select("*").eq("is_active", true).eq("situation_type", situationType).order("display_order", { ascending: true });
    const guidance = (guidanceRows ?? []).map(mapBehaviourGuidanceCard);

    // Urgent situations (a bite already happened, or children are at risk right now) are
    // also escalated into the case/dispatch system so a responder is actually notified -
    // a safety report by itself only sits in a table nobody is paged for.
    let referredToCaseId: string | null = null;
    if (isUrgent) {
      const { data: escalatedCase } = await supabaseAdmin().from("cases").insert({
        case_type: "conflict",
        status: "open",
        priority: "high",
        title: `Safety concern: ${situationType.replace(/_/g, " ")}`,
        description,
        location_text: locationText ?? null,
        location: `POINT(${loc.longitude} ${loc.latitude})`,
        animal_id: animalId ?? null,
        reporter_user_id: authResult.user.id,
      }).select("id").single();
      referredToCaseId = escalatedCase?.id ?? null;
    }

    const { data, error } = await supabaseAdmin().from("safety_reports").insert({
      reporter_user_id: authResult.user.id,
      situation_type: situationType,
      description,
      location_text: locationText ?? null,
      location: `POINT(${loc.longitude} ${loc.latitude})`,
      severity: effectiveSeverity,
      animal_id: animalId ?? null,
      guidance_shown: guidance.map((g) => g.id),
      referred_to_case_id: referredToCaseId,
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "safety_reports", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });

    const report = mapSafetyReport({ ...(data as Record<string, unknown>), location: decodeLocation((data as Record<string, unknown>).location) });
    const humaneResponse = HUMANE_RESPONSES[situationType] ?? DEFAULT_HUMANE_RESPONSE;
    return ok({ report, guidance, humaneResponse }, "Safety report submitted");
  } catch {
    return serverError();
  }
}
