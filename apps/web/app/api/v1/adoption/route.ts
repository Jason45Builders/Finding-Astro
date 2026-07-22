import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const LivingSituationEnum = z.enum(["house_with_yard", "apartment", "shared_accommodation", "other"]);
const PriorExperienceEnum = z.enum(["none", "some", "experienced"]);

const ApplyAdoptionSchema = z.object({
  animalId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  livingSituation: LivingSituationEnum,
  hasOtherPets: z.boolean().optional(),
  otherPetsDesc: z.string().optional(),
  priorExperience: PriorExperienceEnum.optional(),
  hoursAlonePerDay: z.number().nonnegative().optional(),
  reasonForAdopting: z.string().min(1),
});

const MarkAdoptableSchema = z.object({
  animalId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const species = url.searchParams.get("species");

  let query = supabaseAdmin().from("animals").select("*").eq("status", "adopted");
  if (species) query = query.eq("species", species);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok(data ?? [], "Adoptable animals loaded", { count: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");

    if (pathParts[1] === "adoption" && pathParts[2] === "apply") return handleApply(req, authResult.user);
    if (pathParts[1] === "adoption" && pathParts[2] === "applications") return handleGetApplications(req, authResult.user);
    if (pathParts[1] === "adoption" && pathParts[3] === "confirm") return handleConfirm(req, authResult.user);
    if (pathParts[1] === "adoption" && pathParts[2] === "mark-adoptable") return handleMarkAdoptable(req, authResult.user);

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

    const { data, error } = await supabaseAdmin().from("adoption_applications").insert({
      animal_id: animalId, applicant_user_id: user.id, full_name: fullName, phone, address,
      living_situation: livingSituation, has_other_pets: hasOtherPets ?? false, other_pets_desc: otherPetsDesc ?? null,
      prior_experience: priorExperience ?? "none", hours_alone_per_day: hoursAlonePerDay ?? 4,
      reason_for_adopting: reasonForAdopting, status: "pending_review",
      adoption_fee_inr: 0, fee_paid: false,
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "adoption_applications", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
    return ok(data, "Adoption application submitted");
  } catch {
    return serverError();
  }
}

async function handleGetApplications(req: NextRequest, user: { id: string; role: string }) {
  let query = supabaseAdmin().from("adoption_applications").select("*");
  if (user.role !== "admin") query = query.eq("applicant_user_id", user.id);
  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok(data ?? [], "Applications loaded");
}

async function handleConfirm(req: NextRequest, _user: { id: string; role: string }) {
  const url = new URL(req.url);
  const appId = url.pathname.replace(/.*\/applications\//, "").replace(/\/confirm.*$/, "");
  if (!appId) return badRequest("VALIDATION_ERROR", "application id required");

    const { data, error } = await supabaseAdmin().from("adoption_applications").update({ status: "adopted", updated_at: new Date().toISOString() }).eq("id", appId).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "adoption_applications", recordId: appId, action: "UPDATE", actorId: _user.id, actorRole: _user.role, newData: data });
    return ok(data, "Adoption confirmed");
}

async function handleMarkAdoptable(req: NextRequest, _user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(MarkAdoptableSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { animalId } = parsed.data;
    const { data, error } = await supabaseAdmin().from("animals").update({ status: "adopted", adoptable_since: new Date().toISOString() }).eq("id", animalId).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "animals", recordId: animalId, action: "UPDATE", actorId: _user.id, actorRole: _user.role, newData: data });
    return ok(data, "Animal marked adoptable");
  } catch {
    return serverError();
  }
}
