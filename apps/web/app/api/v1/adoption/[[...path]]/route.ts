import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { requireOrg, hasOrgPermission } from "@/lib/org-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimal, mapAdoptionApplication } from "@/lib/types";
import { decodeLocation } from "@/lib/geo";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const LivingSituationEnum = z.enum(["house_with_yard", "apartment", "shared_accommodation", "other"]);
const PriorExperienceEnum = z.enum(["none", "some", "experienced"]);
const ApplyAdoptionSchema = z.object({
  animalId: z.string().uuid(), fullName: z.string().min(1).max(100), phone: z.string().min(1).max(20),
  address: z.string().min(1).max(500), livingSituation: LivingSituationEnum, hasOtherPets: z.boolean().optional(),
  otherPetsDesc: z.string().max(500).optional(), priorExperience: PriorExperienceEnum.optional(),
  hoursAlonePerDay: z.number().nonnegative().optional(), reasonForAdopting: z.string().min(1).max(2000),
});
const MarkAdoptableSchema = z.object({ animalId: z.string().uuid() });
const ReviewSchema = z.object({
  reviewNotes: z.string().optional(), rejectionReason: z.string().optional(),
  adoptionFeeInr: z.number().nonnegative().optional(), trialDays: z.number().int().positive().optional(),
});

async function getNgoScope(req: NextRequest, user: { role: string }, permission?: string): Promise<string | null | Response> {
  if (user.role !== "ngo") return null;
  const result = await requireOrg(req);
  if (result instanceof Response) return result;
  if (permission && !hasOrgPermission(result.org.permissions, permission)) {
    return new Response(JSON.stringify({ success: false, code: "FORBIDDEN", message: "Insufficient organization permissions" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  return result.org.welfareGroupId;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/adoption\/?/, "").split("/").filter(Boolean);

  if (pathParts[0] === "applications") {
    const authResult = await authMiddleware(req);
    if ("error" in authResult) return authResult.error;
    const orgId = await getNgoScope(req, authResult.user);
    if (orgId instanceof Response) return orgId;
    return handleGetApplications(authResult.user, orgId);
  }

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
  const rate = await checkRateLimit(\`adoption:\${authResult.user.id}:\${ip}\`, userAgent);
  if (!rate.allowed) return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: \`Too many requests. Retry after \${rate.retryAfter}s\` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });

  try {
    const pathParts = new URL(req.url).pathname.replace(/\/api\/v1\/adoption\/?/, "").split("/").filter(Boolean);
    if (pathParts[0] === "apply") return handleApply(req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "confirm") return handleConfirm(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "approve") return handleApprove(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "reject") return handleReject(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "start-trial") return handleStartTrial(pathParts[1], req, authResult.user);
    if (pathParts[0] === "applications" && pathParts[2] === "complete-trial") return handleCompleteTrial(pathParts[1], req, authResult.user);
    if (pathParts[0] === "mark-adoptable") return handleMarkAdoptable(req, authResult.user);
    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}

async function handleApply(req: NextRequest, user: { id: string; role: string }) {
  const parsed = validateBody(ApplyAdoptionSchema, await req.json());
  if (!parsed.ok) return parsed.response;
  const { animalId, fullName, phone, address, livingSituation, hasOtherPets, otherPetsDesc, priorExperience, hoursAlonePerDay, reasonForAdopting } = parsed.data;

  const { data: animal, error: animalError } = await supabaseAdmin().from("animals").select("id, welfare_group_id, adoptable_since").eq("id", animalId).maybeSingle();
  if (animalError) return serverError(animalError.message);
  if (!animal) return badRequest("ANIMAL_NOT_FOUND", "Animal not found");
  if (!animal.adoptable_since) return badRequest("NOT_ADOPTABLE", "This animal is not currently available for adoption");

  const { data: blacklistEntry, error: blacklistError } = await supabaseAdmin().from("adopter_blacklist").select("id, reason").or(\`user_id.eq.\${user.id},phone.eq.\${phone}\`).maybeSingle();
  if (blacklistError) return serverError(blacklistError.message);
  if (blacklistEntry) return badRequest("BLACKLISTED", \`You are not eligible to adopt. Reason: \${blacklistEntry.reason ?? "Previous adoption violation"}\`);

  const { data, error } = await supabaseAdmin().from("adoption_applications").insert({
    animal_id: animalId, welfare_group_id: animal.welfare_group_id ?? null, applicant_user_id: user.id,
    full_name: fullName, phone, address, living_situation: livingSituation, has_other_pets: hasOtherPets ?? false,
    other_pets_desc: otherPetsDesc ?? null, prior_experience: priorExperience ?? "none",
    hours_alone_per_day: hoursAlonePerDay ?? 4, reason_for_adopting: reasonForAdopting,
    status: "pending_review", adoption_fee_inr: 0, fee_paid: false,
  }).select("*").single();

  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Adoption application submitted");
}

async function handleGetApplications(user: { id: string; role: string }, orgId: string | null | Response) {
  if (orgId instanceof Response) return orgId;
  let query = supabaseAdmin().from("adoption_applications").select("*");
  if (orgId) query = query.eq("welfare_group_id", orgId);
  else if (user.role !== "admin") query = query.eq("applicant_user_id", user.id);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapAdoptionApplication), "Applications loaded");
}

async function loadStaffApplication(req: NextRequest, appId: string | undefined, user: { id: string; role: string }) {
  if (!appId) return { error: badRequest("VALIDATION_ERROR", "application id required") };
  const orgId = await getNgoScope(req, user, "adoptions:write");
  if (orgId instanceof Response) return { error: orgId };
  let query = supabaseAdmin().from("adoption_applications").select("*").eq("id", appId);
  if (orgId) query = query.eq("welfare_group_id", orgId);
  const { data, error } = await query.maybeSingle();
  if (error) return { error: serverError(error.message) };
  if (!data) return { error: badRequest("NOT_FOUND", "Adoption application not found") };
  return { data, orgId };
}

async function handleConfirm(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  const loaded = await loadStaffApplication(req, appId, user);
  if ("error" in loaded) return loaded.error;
  const application = loaded.data as Record<string, unknown>;
  const isPlatformStaff = ["admin", "govt"].includes(user.role);
  const isReviewer = application.reviewed_by_user_id === user.id;
  const isOrgReviewer = !!loaded.orgId;
  if (!isPlatformStaff && !isReviewer && !isOrgReviewer) return badRequest("FORBIDDEN", "You are not authorized to confirm this adoption");
  if (application.status === "adopted") return badRequest("INVALID_STATUS", "Adoption is already confirmed");
  if (application.status === "rejected" || application.status === "returned") return badRequest("INVALID_STATUS", "This adoption cannot be confirmed");

  const updateQuery = supabaseAdmin().from("adoption_applications").update({ status: "adopted", updated_at: new Date().toISOString() }).eq("id", appId!);
  const { data, error } = await updateQuery.select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId!, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Adoption confirmed");
}

async function handleMarkAdoptable(req: NextRequest, user: { id: string; role: string }) {
  const parsed = validateBody(MarkAdoptableSchema, await req.json());
  if (!parsed.ok) return parsed.response;
  const orgId = await getNgoScope(req, user, "animals:write");
  if (orgId instanceof Response) return orgId;
  if (user.role !== "ngo" && !["admin", "govt"].includes(user.role)) return badRequest("FORBIDDEN", "Only NGO or platform staff can mark animals as adoptable");

  let query = supabaseAdmin().from("animals").update({ adoptable_since: new Date().toISOString() }).eq("id", parsed.data.animalId);
  if (orgId) query = query.eq("welfare_group_id", orgId);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) return serverError(error.message);
  if (!data) return badRequest("NOT_FOUND", "Animal not found in the active organization");
  await audit({ tableName: "animals", recordId: parsed.data.animalId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAnimal({ ...data, location: decodeLocation(data.location) }), "Animal marked adoptable");
}

async function handleApprove(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  const loaded = await loadStaffApplication(req, appId, user);
  if ("error" in loaded) return loaded.error;
  const parsed = validateBody(ReviewSchema, await req.json().catch(() => ({})));
  if (!parsed.ok) return parsed.response;
  const update: Record<string, unknown> = { status: "approved", review_notes: parsed.data.reviewNotes ?? null, reviewed_by_user_id: user.id, updated_at: new Date().toISOString() };
  if (parsed.data.adoptionFeeInr !== undefined) update.adoption_fee_inr = parsed.data.adoptionFeeInr;
  let query = supabaseAdmin().from("adoption_applications").update(update).eq("id", appId!);
  if (loaded.orgId) query = query.eq("welfare_group_id", loaded.orgId);
  const { data, error } = await query.select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId!, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Application approved");
}

async function handleReject(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  const loaded = await loadStaffApplication(req, appId, user);
  if ("error" in loaded) return loaded.error;
  const parsed = validateBody(ReviewSchema, await req.json().catch(() => ({})));
  if (!parsed.ok) return parsed.response;
  const update = { status: "rejected", rejection_reason: parsed.data.rejectionReason ?? null, review_notes: parsed.data.reviewNotes ?? null, reviewed_by_user_id: user.id, updated_at: new Date().toISOString() };
  let query = supabaseAdmin().from("adoption_applications").update(update).eq("id", appId!);
  if (loaded.orgId) query = query.eq("welfare_group_id", loaded.orgId);
  const { data, error } = await query.select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId!, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Application rejected");
}

async function handleStartTrial(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  const loaded = await loadStaffApplication(req, appId, user);
  if ("error" in loaded) return loaded.error;
  const parsed = validateBody(ReviewSchema, await req.json().catch(() => ({})));
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.trialDays || parsed.data.trialDays <= 0) return badRequest("VALIDATION_ERROR", "trialDays must be a positive integer");
  const startDate = new Date(), endDate = new Date();
  endDate.setDate(startDate.getDate() + parsed.data.trialDays);
  const update = { status: "trial", trial_start_date: startDate.toISOString().split("T")[0], trial_end_date: endDate.toISOString().split("T")[0], trial_check_notes: parsed.data.reviewNotes ?? null, reviewed_by_user_id: user.id, updated_at: new Date().toISOString() };
  let query = supabaseAdmin().from("adoption_applications").update(update).eq("id", appId!);
  if (loaded.orgId) query = query.eq("welfare_group_id", loaded.orgId);
  const { data, error } = await query.select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId!, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Trial period started");
}

async function handleCompleteTrial(appId: string | undefined, req: NextRequest, user: { id: string; role: string }) {
  const loaded = await loadStaffApplication(req, appId, user);
  if ("error" in loaded) return loaded.error;
  let query = supabaseAdmin().from("adoption_applications").update({ status: "adopted", updated_at: new Date().toISOString() }).eq("id", appId!);
  if (loaded.orgId) query = query.eq("welfare_group_id", loaded.orgId);
  const { data, error } = await query.select("*").single();
  if (error) return serverError(error.message);
  if (data) await audit({ tableName: "adoption_applications", recordId: appId!, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
  return ok(mapAdoptionApplication(data), "Trial completed, adoption confirmed");
}
