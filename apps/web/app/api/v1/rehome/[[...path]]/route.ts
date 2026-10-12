import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, forbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const SubmitSchema = z.object({
  animalType: z.enum(["own_pet", "community_animal"]),
  species: z.enum(["dog", "cat", "bird", "other"]),
  animalName: z.string().max(100).optional(),
  breed: z.string().max(100).optional(),
  ageMonths: z.number().int().nonnegative().optional(),
  gender: z.string().max(20).optional(),
  description: z.string().min(10).max(2000),
  rehomeReason: z.string().min(10).max(2000),
  contactName: z.string().min(2).max(100),
  contactPhone: z.string().min(7).max(20),
  locationText: z.string().min(3).max(250),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoUrl: z.string().url().optional().or(z.literal("")),
  ownershipConfirmed: z.boolean().optional(),
  helperAcknowledged: z.boolean().optional(),
});
const ReviewSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["approve", "reject", "needs_info"]),
  reviewNotes: z.string().max(2000).optional(),
});

function isModerator(role: string) { return ["admin", "govt"].includes(role); }

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  const parts = new URL(req.url).pathname.replace(/\/api\/v1\/rehome\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "review") {
    if (!isModerator(auth.user.role)) return forbidden("Only Finding Astro moderators can review rehoming requests");
    const { data, error } = await supabaseAdmin().from("rehome_requests").select("*").in("status", ["pending_review", "needs_info"]).order("created_at", { ascending: true });
    if (error) return serverError(error.message);
    return ok(data ?? [], "Rehoming review queue loaded");
  }
  const { data, error } = await supabaseAdmin().from("rehome_requests").select("id,animal_type,species,animal_name,breed,age_months,gender,description,rehome_reason,location_text,photo_url,status,review_notes,linked_animal_id,created_at,updated_at,reviewed_at").eq("applicant_user_id", auth.user.id).order("created_at", { ascending: false });
  if (error) return serverError(error.message);
  return ok(data ?? [], "Your rehoming requests loaded");
}

export async function POST(req: NextRequest) {
  const csrf = requireCsrf(req);
  if (csrf) return csrf;
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  const rate = await checkRateLimit(`rehome:${auth.user.id}:${getClientIp(req)}`, req.headers.get("user-agent") ?? "unknown");
  if (!rate.allowed) return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  const parsed = validateBody(SubmitSchema, await req.json());
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;
  if (b.animalType === "own_pet" && !b.ownershipConfirmed) return badRequest("AUTHORITY_CONFIRMATION_REQUIRED", "Confirm that you are the owner or legally authorised caretaker.");
  if (b.animalType === "community_animal" && !b.helperAcknowledged) return badRequest("HELPER_CONFIRMATION_REQUIRED", "Confirm that you are reporting an animal for review and are not claiming ownership.");
  const { data: recent, error: duplicateError } = await supabaseAdmin().from("rehome_requests").select("id").eq("applicant_user_id", auth.user.id).in("status", ["pending_review", "needs_info"]).limit(1);
  if (duplicateError) return serverError(duplicateError.message);
  if (recent?.length) return badRequest("REQUEST_ALREADY_PENDING", "You already have a rehoming request awaiting review. You can track it below.");
  const { data, error } = await supabaseAdmin().from("rehome_requests").insert({
    applicant_user_id: auth.user.id, animal_type: b.animalType, species: b.species,
    animal_name: b.animalName || null, breed: b.breed || null, age_months: b.ageMonths ?? null,
    gender: b.gender || null, description: b.description, rehome_reason: b.rehomeReason,
    contact_name: b.contactName, contact_phone: b.contactPhone, location_text: b.locationText,
    latitude: b.latitude, longitude: b.longitude, photo_url: b.photoUrl || null,
    ownership_confirmed: b.animalType === "own_pet" && !!b.ownershipConfirmed,
    helper_acknowledged: b.animalType === "community_animal" && !!b.helperAcknowledged,
    status: "pending_review",
  }).select("id,animal_type,species,animal_name,status,created_at").single();
  if (error) return serverError(error.message);
  await audit({ tableName: "rehome_requests", recordId: data.id, action: "INSERT", actorId: auth.user.id, actorRole: auth.user.role, newData: data });
  return ok(data, "Request submitted for review. It will not appear publicly until approved.");
}

export async function PATCH(req: NextRequest) {
  const csrf = requireCsrf(req);
  if (csrf) return csrf;
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (!isModerator(auth.user.role)) return forbidden("Only Finding Astro moderators can review rehoming requests");
  const parsed = validateBody(ReviewSchema, await req.json());
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;
  const db = supabaseAdmin();
  const { data: request, error: loadError } = await db.from("rehome_requests").select("*").eq("id", b.requestId).maybeSingle();
  if (loadError) return serverError(loadError.message);
  if (!request) return badRequest("NOT_FOUND", "Rehoming request not found");
  if (!["pending_review", "needs_info"].includes(request.status)) return badRequest("INVALID_STATUS", "This request has already been reviewed or withdrawn");

  let linkedAnimalId = request.linked_animal_id as string | null;
  if (b.action === "approve") {
    if (linkedAnimalId) return badRequest("ALREADY_PUBLISHED", "This request already has a linked animal listing");
    const { data: animal, error: animalError } = await db.from("animals").insert({
      species: request.species, name: request.animal_name, breed: request.breed,
      approx_age_months: request.age_months, gender: request.gender,
      description: request.description, location: `POINT(${request.longitude} ${request.latitude})`,
      territory_label: request.location_text, primary_photo_url: request.photo_url,
      photo_urls: request.photo_url ? [request.photo_url] : [], status: "community",
      created_by_user_id: request.applicant_user_id, welfare_group_id: null,
      adoptable_since: new Date().toISOString(), visibility: "public_adoption",
      visibility_reason: "Approved citizen rehoming request", visibility_changed_by: auth.user.id,
      visibility_changed_at: new Date().toISOString(), vaccination_status: "unverified",
      is_sterilized: false, disappearance_risk_level: "stable",
    }).select("id").single();
    if (animalError) return serverError(animalError.message);
    linkedAnimalId = animal.id;
  }
  const status = b.action === "approve" ? "approved" : b.action === "reject" ? "rejected" : "needs_info";
  const { data, error } = await db.from("rehome_requests").update({
    status, reviewer_user_id: auth.user.id, review_notes: b.reviewNotes ?? null,
    linked_animal_id: linkedAnimalId, reviewed_at: b.action === "needs_info" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", request.id).in("status", ["pending_review", "needs_info"]).select("id,status,linked_animal_id,review_notes").maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return badRequest("REVIEW_RACE", "This request was changed by another reviewer. Refresh and try again.");
  await audit({ tableName: "rehome_requests", recordId: request.id, action: "UPDATE", actorId: auth.user.id, actorRole: auth.user.role, newData: data });
  return ok(data, status === "approved" ? "Approved and published to the adoption centre" : status === "rejected" ? "Request rejected" : "More information requested");
}
