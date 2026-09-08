import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimal, mapAdoptionApplication } from "@/lib/types";
import { decodeLocation } from "@/lib/geo";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const LivingSituationEnum = z.enum(["house_with_yard", "apartment", "shared_accommodation", "other"]);
const PriorExperienceEnum = z.enum(["none", "some", "experienced"]);

const ApplyAdoptionSchema = z.object({
  animalId: z.string().uuid(),
  fullName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  address: z.string().min(1).max(500),
  livingSituation: LivingSituationEnum,
  hasOtherPets: z.boolean().optional(),
  otherPetsDesc: z.string().max(500).optional(),
  priorExperience: PriorExperienceEnum.optional(),
  hoursAlonePerDay: z.number().nonnegative().optional(),
  reasonForAdopting: z.string().min(1).max(2000),
});

const MarkAdoptableSchema = z.object({
  animalId: z.string().uuid(),
});

const ReviewSchema = z.object({
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  adoptionFeeInr: z.number().nonnegative().optional(),
  trialDays: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/adoption\/?/, "").split("/").filter(Boolean);

  if (pathParts[0] === "applications") {
    const authResult = await authMiddleware(req);
    if ("error" in authResult) return authResult.error;
    return handleGetApplications(req, authResult.user);
  }

  // bare /adoption or /adoption/animals — both list adoptable animals
  const species = url.searchParams.get("species");
  let query = supabaseAdmin().from("animals").select("*").not("adoptable_since", "is", null);
  if (species) query = query.eq("species", species);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok((data ?? []).map((row) => mapAnimal({ ...row, location: decodeLocation(row.location) })), "Adoptable animals loaded", { count: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`adoption:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/adoption\/?/, "").split("/").filter(Boolean);

    if (pathParts[0] === "apply") return handleApply(req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "confirm") return handleConfirm(pathParts[1], authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "approve") return handleApprove(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "reject") return handleReject(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "start-trial") return handleStartTrial(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "complete-trial") return handleCompleteTrial(pathParts[1], authResult.user);
    if (pathParts[0] === "mark-adoptable") return handleMarkAdoptable(req, authResult.user);

    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}

async function handleApply(req: NextRequest, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(ApplyAdoptionSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { animalId, fullName, phone, address, livingSituation, hasOtherPets, otherPetsDesc, priorExperience, hoursAlonePerDay, reasonForAdopting } = parsed.data;

    const { data: blacklistEntry, error: blacklistError } = await supabaseAdmin().from("adopter_blacklist").select("id, reason").or(`user_id.eq.${user.id},phone.eq.${phone}`).maybeSingle();
    if (blacklistError) return serverError(blacklistError.message);
    if (blacklistEntry) {
      return badRequest("BLACKLISTED", `You are not eligible to adopt. Reason: ${(blacklistEntry as Record<string, unknown>).reason ?? "Previous adoption violation"}`);
    }

    const { data, error } = await supabaseAdmin().from("adoption_applications").insert({
      animal_id: animalId, applicant_user_id: user.id, full_name: fullName, phone, address,
      living_situation: livingSituation, has_other_pets: hasOtherPets ?? false, other_pets_desc: otherPetsDesc ?? null,
      prior_experience: priorExperience ?? "none", hours_alone_per_day: hoursAlonePerDay ?? 4,
      reason_for_adopting: reasonForAdopting, status: "pending_review",
      adoption_fee_inr: 0, fee_paid: false,
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "adoption_applications", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
    return ok(mapAdoptionApplication(data), "Adoption application submitted");
  } catch {
    return serverError();
  }
}

async function handleGetApplications(req: NextRequest, user: { id: string; role: string }) {
  let query = supabaseAdmin().from("adoption_applications").select("*");
  if (user.role !== "admin") query = query.eq("applicant_user_id", user.id);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapAdoptionApplication), "Applications loaded");
}

async function handleConfirm(appId: string | undefined, user: { id: string; role: string }) {
  if (!appId) return badRequest("VALIDATION_ERROR", "application id required");

  const { data: existing, error: fetchError } = await supabaseAdmin().from("adoption_applications").select("status, reviewed_by_user_id, trial_start_date, trial_end_date").eq("id", appId).single();
  if (fetchError || !existing) return badRequest("NOT_FOUND", "Adoption application not found");

  const application = existing as Record<string, unknown>;
  if (application.status === "adopted") return badRequest("INVALID_STATUS", "Adoption is already confirmed");
  if (application.status === "rejected") return badRequest("INVALID_STATUS", "Cannot confirm a rejected application");
  if (application.status === "returned") return badRequest("INVALID_STATUS", "Cannot confirm a returned adoption");

  const isAdmin = ["admin", "govt"].includes(user.role);
  const isReviewer = application.reviewed_by_user_id === user.id;
  if (!isAdmin && !isReviewer) return badRequest("FORBIDDEN", "Only the reviewing admin or platform staff can confirm adoption");

  const { data, error } = await supabaseAdmin().from("adoption_applications").update({ status: "adopted", updated_at: new Date().toISOString() }).eq("id", appId).select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Adoption confirmed");
}

async function handleMarkAdoptable(req: NextRequest, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(MarkAdoptableSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { animalId } = parsed.data;

    const isStaff = ["admin", "govt", "ngo"].includes(user.role);
    if (!isStaff) return badRequest("FORBIDDEN", "Only NGO or admin staff can mark animals as adoptable");

    const { data, error } = await supabaseAdmin().from("animals").update({ adoptable_since: new Date().toISOString() }).eq("id", animalId).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "animals", recordId: animalId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
    return ok(mapAnimal({ ...data, location: decodeLocation(data.location) }), "Animal marked adoptable");
  } catch {
    return serverError();
  }
}

async function handleApprove(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  if (!appId) return badRequest("VALIDATION_ERROR", "application id required");
  const raw = await req.json().catch(() => ({}));
  const parsed = validateBody(ReviewSchema, raw);
  if (!parsed.ok) return parsed.response;
  const update: Record<string, unknown> = {
    status: "approved",
    review_notes: parsed.data.reviewNotes ?? null,
    reviewed_by_user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.adoptionFeeInr !== undefined) update.adoption_fee_inr = parsed.data.adoptionFeeInr;
  const { data, error } = await supabaseAdmin().from("adoption_applications").update(update).eq("id", appId).select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Application approved");
}

async function handleReject(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  if (!appId) return badRequest("VALIDATION_ERROR", "application id required");
  const raw = await req.json().catch(() => ({}));
  const parsed = validateBody(ReviewSchema, raw);
  if (!parsed.ok) return parsed.response;
  const { data, error } = await supabaseAdmin().from("adoption_applications").update({
    status: "rejected",
    rejection_reason: parsed.data.rejectionReason ?? null,
    review_notes: parsed.data.reviewNotes ?? null,
    reviewed_by_user_id: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", appId).select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Application rejected");
}

async function handleStartTrial(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  if (!appId) return badRequest("VALIDATION_ERROR", "application id required");
  const raw = await req.json().catch(() => ({}));
  const parsed = validateBody(ReviewSchema, raw);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.trialDays || parsed.data.trialDays <= 0) return badRequest("VALIDATION_ERROR", "trialDays must be a positive integer");
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + parsed.data.trialDays);
  const { data, error } = await supabaseAdmin().from("adoption_applications").update({
    status: "trial",
    trial_start_date: startDate.toISOString().split("T")[0],
    trial_end_date: endDate.toISOString().split("T")[0],
    trial_check_notes: parsed.data.reviewNotes ?? null,
    reviewed_by_user_id: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", appId).select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Trial period started");
}

async function handleCompleteTrial(appId: string | undefined, user: { id: string; role: string }) {
  if (!appId) return badRequest("VALIDATION_ERROR", "application id required");
  const { data, error } = await supabaseAdmin().from("adoption_applications").update({
    status: "adopted",
    updated_at: new Date().toISOString(),
  }).eq("id", appId).select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Trial completed, adoption confirmed");
}
