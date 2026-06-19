/**
 * adoption.service.ts
 * Full adoption pipeline. Expert principle: "Adoption is not a feature. It's a responsibility pipeline."
 * PLACE AT: backend/src/modules/funding/adoption.service.ts
 * (Using funding dir since adoption dir doesn't exist yet)
 */

import crypto from "node:crypto";
import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { logger } from "../../utils/logger";

const AGREEMENT_TEXT = `FINDING ASTRO ADOPTION AGREEMENT

By accepting this agreement you commit to:
1. Providing the animal with adequate food, water, shelter, and veterinary care.
2. Not abandoning, re-homing, or selling the animal without informing Finding Astro.
3. Completing the post-adoption follow-up check within 30 days.
4. Notifying Finding Astro immediately if you can no longer care for the animal.

Abandonment or cruelty is prosecutable under the Prevention of Cruelty to Animals Act, 1960.`.trim();

const AGREEMENT_HASH = crypto.createHash("sha256").update(AGREEMENT_TEXT).digest("hex");

export type AdoptionStatus = "pending_review" | "approved" | "trial" | "adopted" | "rejected" | "returned";

export interface AdoptionApplicationRecord {
  id: string; animalId: string; applicantUserId: string; reviewedByUserId: string | null;
  fullName: string; phone: string; address: string;
  livingSituation: "house_with_yard" | "apartment" | "shared_accommodation" | "other";
  hasOtherPets: boolean; otherPetsDesc: string | null;
  priorExperience: "none" | "some" | "experienced";
  hoursAlonePerDay: number; reasonForAdopting: string;
  status: AdoptionStatus; rejectionReason: string | null; reviewNotes: string | null;
  trialStartDate: string | null; trialEndDate: string | null; trialCheckNotes: string | null;
  adoptionFeeInr: number; feePaid: boolean;
  agreementAcceptedAt: Date | null; agreementTextHash: string | null;
  followupDoneAt: Date | null; followupNotes: string | null;
  createdAt: Date; updatedAt: Date;
}

interface AppRow {
  id: string; animal_id: string; applicant_user_id: string; reviewed_by_user_id: string | null;
  full_name: string; phone: string; address: string; living_situation: string;
  has_other_pets: boolean; other_pets_desc: string | null; prior_experience: string;
  hours_alone_per_day: number; reason_for_adopting: string; status: AdoptionStatus;
  rejection_reason: string | null; review_notes: string | null;
  trial_start_date: string | null; trial_end_date: string | null; trial_check_notes: string | null;
  adoption_fee_inr: string; fee_paid: boolean;
  agreement_accepted_at: Date | null; agreement_text_hash: string | null;
  followup_done_at: Date | null; followup_notes: string | null;
  created_at: Date; updated_at: Date;
}

const mapApp = (r: AppRow): AdoptionApplicationRecord => ({
  id: r.id, animalId: r.animal_id, applicantUserId: r.applicant_user_id,
  reviewedByUserId: r.reviewed_by_user_id, fullName: r.full_name, phone: r.phone,
  address: r.address, livingSituation: r.living_situation as AdoptionApplicationRecord["livingSituation"],
  hasOtherPets: r.has_other_pets, otherPetsDesc: r.other_pets_desc,
  priorExperience: r.prior_experience as AdoptionApplicationRecord["priorExperience"],
  hoursAlonePerDay: r.hours_alone_per_day, reasonForAdopting: r.reason_for_adopting,
  status: r.status, rejectionReason: r.rejection_reason, reviewNotes: r.review_notes,
  trialStartDate: r.trial_start_date, trialEndDate: r.trial_end_date, trialCheckNotes: r.trial_check_notes,
  adoptionFeeInr: Number(r.adoption_fee_inr), feePaid: r.fee_paid,
  agreementAcceptedAt: r.agreement_accepted_at, agreementTextHash: r.agreement_text_hash,
  followupDoneAt: r.followup_done_at, followupNotes: r.followup_notes,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export interface ApplyToAdoptInput {
  animalId: string; fullName: string; phone: string; address: string;
  livingSituation: "house_with_yard" | "apartment" | "shared_accommodation" | "other";
  hasOtherPets: boolean; otherPetsDesc?: string | null;
  priorExperience: "none" | "some" | "experienced";
  hoursAlonePerDay: number; reasonForAdopting: string;
}

class AdoptionService {
  getAgreementText() { return { text: AGREEMENT_TEXT, hash: AGREEMENT_HASH }; }

  // ── Adoptable animals listing ────────────────────────────────────────────
  // Expert rule: only rescued dogs, not stable community dogs
  async listAdoptable(filters?: { species?: string; latitude?: number; longitude?: number; radiusKm?: number }) {
    const conds = [
      "a.adoptable_since IS NOT NULL",
      "a.status IN ('found','reunited')",
      "NOT EXISTS (SELECT 1 FROM adoption_applications aa WHERE aa.animal_id = a.id AND aa.status IN ('pending_review','approved','trial'))"
    ];
    const vals: unknown[] = [];
    let distExpr = "NULL::double precision AS distance_km";

    if (filters?.species) { vals.push(filters.species); conds.push(`a.species ILIKE $${vals.length}`); }
    if (filters?.latitude !== undefined && filters?.longitude !== undefined) {
      vals.push(filters.longitude); const li = vals.length;
      vals.push(filters.latitude); const lai = vals.length;
      vals.push((filters?.radiusKm ?? 20) * 1000); const ri = vals.length;
      conds.push(`ST_DWithin(a.location, ST_SetSRID(ST_MakePoint($${li}, $${lai}), 4326)::geography, $${ri})`);
      distExpr = `ST_Distance(a.location, ST_SetSRID(ST_MakePoint($${li}, $${lai}), 4326)::geography) / 1000`;
    }

    const r = await query<{
      id: string; name: string | null; species: string; breed: string | null; color: string | null;
      approx_age_months: number | null; temperament: string | null; is_sterilized: boolean;
      primary_photo_url: string | null; adoptable_since: Date | null; adoption_notes: string | null; distance_km: number | null;
    }>(`SELECT a.id,a.name,a.species,a.breed,a.color,a.approx_age_months,a.temperament,
               a.is_sterilized,a.primary_photo_url,a.adoptable_since,a.adoption_notes,
               ${distExpr} AS distance_km
        FROM animals a WHERE ${conds.join(" AND ")} ORDER BY a.adoptable_since ASC LIMIT 50`, vals);

    return r.rows.map(row => ({
      id: row.id, name: row.name, species: row.species, breed: row.breed, color: row.color,
      approxAgeMonths: row.approx_age_months, temperament: row.temperament,
      isSterilized: row.is_sterilized, primaryPhotoUrl: row.primary_photo_url,
      adoptableSince: row.adoptable_since, adoptionNotes: row.adoption_notes,
      distanceKm: row.distance_km !== null ? Number(row.distance_km) : null,
    }));
  }

  // ── Mark animal as adoptable (NGO/admin only) ────────────────────────────
  async markAdoptable(animalId: string, actor: AuthenticatedUser, notes?: string | null) {
    if (!["ngo","govt","admin"].includes(actor.role))
      throw new AppError("Only NGOs and admins can mark animals as adoptable", 403, "FORBIDDEN");
    const r = await query<{ status: string }>(`SELECT status FROM animals WHERE id = $1`, [animalId]);
    if (!r.rows[0]) throw new AppError("Animal not found", 404, "ANIMAL_NOT_FOUND");
    // Expert rule: DO NOT list community dogs for adoption
    if (r.rows[0].status === "community")
      throw new AppError("Stable community animals should not be listed for adoption. Only rescued or recovered animals are eligible.", 422, "INELIGIBLE_STATUS");
    await query(`UPDATE animals SET adoptable_since = NOW(), adoption_notes = $2, updated_at = NOW() WHERE id = $1`, [animalId, notes ?? null]);
    logger.info("Animal marked adoptable", { animalId, actor: actor.id });
  }

  // ── Blacklist check ──────────────────────────────────────────────────────
  async isBlacklisted(userId: string, phone: string): Promise<boolean> {
    const r = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM adopter_blacklist WHERE is_active = TRUE AND (user_id = $1 OR phone = $2)`,
      [userId, phone]
    );
    return Number(r.rows[0]?.count ?? 0) > 0;
  }

  // ── Apply to adopt ───────────────────────────────────────────────────────
  async apply(actor: AuthenticatedUser, input: ApplyToAdoptInput): Promise<AdoptionApplicationRecord> {
    if (await this.isBlacklisted(actor.id, input.phone))
      throw new AppError("Your account is not eligible to apply for adoption. Contact support.", 403, "BLACKLISTED");

    const ar = await query<{ adoptable_since: Date | null; name: string | null }>(
      `SELECT adoptable_since, name FROM animals WHERE id = $1`, [input.animalId]
    );
    if (!ar.rows[0]) throw new AppError("Animal not found", 404, "ANIMAL_NOT_FOUND");
    if (!ar.rows[0].adoptable_since) throw new AppError("This animal is not currently listed for adoption.", 422, "NOT_ADOPTABLE");

    const ex = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM adoption_applications WHERE animal_id = $1 AND status IN ('pending_review','approved','trial')`,
      [input.animalId]
    );
    if (Number(ex.rows[0]?.count ?? 0) > 0)
      throw new AppError("This animal already has an active adoption application.", 409, "APPLICATION_IN_PROGRESS");

    const ux = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM adoption_applications WHERE animal_id = $1 AND applicant_user_id = $2 AND status NOT IN ('rejected','returned')`,
      [input.animalId, actor.id]
    );
    if (Number(ux.rows[0]?.count ?? 0) > 0)
      throw new AppError("You already have an active application for this animal.", 409, "DUPLICATE_APPLICATION");

    const res = await query<AppRow>(
      `INSERT INTO adoption_applications (animal_id,applicant_user_id,full_name,phone,address,living_situation,has_other_pets,other_pets_desc,prior_experience,hours_alone_per_day,reason_for_adopting)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [input.animalId, actor.id, input.fullName, input.phone, input.address,
       input.livingSituation, input.hasOtherPets, input.otherPetsDesc ?? null,
       input.priorExperience, input.hoursAlonePerDay, input.reasonForAdopting]
    );
    logger.info("Adoption application submitted", { applicationId: res.rows[0].id, animalId: input.animalId });
    return mapApp(res.rows[0]);
  }

  // ── NGO reviews application ──────────────────────────────────────────────
  async review(
    actor: AuthenticatedUser,
    applicationId: string,
    decision: { approved: boolean; reviewNotes?: string | null; rejectionReason?: string | null }
  ): Promise<AdoptionApplicationRecord> {
    if (!["ngo","govt","admin"].includes(actor.role)) throw new AppError("Only NGOs and admins can review applications", 403, "FORBIDDEN");
    const r = await query<AppRow>(`SELECT * FROM adoption_applications WHERE id = $1 FOR UPDATE`, [applicationId]);
    const app = r.rows[0];
    if (!app) throw new AppError("Application not found", 404, "NOT_FOUND");
    if (app.status !== "pending_review") throw new AppError("Application is no longer in pending review", 422, "INVALID_STATE");

    const upd = await query<AppRow>(
      `UPDATE adoption_applications SET status=$2,reviewed_by_user_id=$3,review_notes=$4,rejection_reason=$5,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [applicationId, decision.approved ? "approved" : "rejected", actor.id, decision.reviewNotes ?? null, decision.rejectionReason ?? null]
    );
    await notificationService.notifyUser(
      app.applicant_user_id, "adoption",
      decision.approved ? "Adoption application approved!" : "Adoption application update",
      decision.approved
        ? "Your application has been approved. The NGO will contact you to arrange the trial period."
        : `Not approved. ${decision.rejectionReason ?? ""}`.trim(),
      { applicationId, animalId: app.animal_id }
    );
    return mapApp(upd.rows[0]);
  }

  // ── Start trial period (3–7 days) ────────────────────────────────────────
  async startTrial(actor: AuthenticatedUser, applicationId: string, trialDays: 3 | 5 | 7 = 7): Promise<AdoptionApplicationRecord> {
    if (!["ngo","govt","admin"].includes(actor.role)) throw new AppError("Only NGOs and admins can start trials", 403, "FORBIDDEN");
    const r = await query<AppRow>(`SELECT * FROM adoption_applications WHERE id = $1 FOR UPDATE`, [applicationId]);
    const app = r.rows[0];
    if (!app) throw new AppError("Application not found", 404, "NOT_FOUND");
    if (app.status !== "approved") throw new AppError("Trial can only start for approved applications", 422, "INVALID_STATE");

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + trialDays);

    const upd = await query<AppRow>(
      `UPDATE adoption_applications SET status='trial',trial_start_date=$2,trial_end_date=$3,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [applicationId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
    );
    await notificationService.notifyUser(app.applicant_user_id, "adoption", `${trialDays}-day trial started`,
      `Your trial period ends on ${end.toLocaleDateString("en-IN")}. Please reach out if you have any concerns.`,
      { applicationId, animalId: app.animal_id, trialEndDate: end.toISOString() }
    );
    return mapApp(upd.rows[0]);
  }

  // ── Accept agreement and confirm adoption ────────────────────────────────
  async confirm(actor: AuthenticatedUser, applicationId: string): Promise<AdoptionApplicationRecord> {
    const r = await query<AppRow>(`SELECT * FROM adoption_applications WHERE id = $1 FOR UPDATE`, [applicationId]);
    const app = r.rows[0];
    if (!app) throw new AppError("Application not found", 404, "NOT_FOUND");
    if (app.applicant_user_id !== actor.id) throw new AppError("You can only confirm your own adoption", 403, "FORBIDDEN");
    if (app.status !== "trial") throw new AppError("Adoption can only be confirmed after a trial period", 422, "INVALID_STATE");

    return withTransaction(async (client) => {
      const upd = await client.query<AppRow>(
        `UPDATE adoption_applications SET status='adopted',agreement_accepted_at=NOW(),agreement_text_hash=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,
        [applicationId, AGREEMENT_HASH]
      );
      await client.query(`UPDATE animals SET status='adopted', adoptable_since=NULL, updated_at=NOW() WHERE id=$1`, [app.animal_id]);
      await notificationService.notifyUser(actor.id, "adoption", "🎉 Adoption confirmed!",
        "Congratulations! Thank you for giving this animal a forever home.", { applicationId, animalId: app.animal_id }
      );
      logger.info("Adoption confirmed", { applicationId, animalId: app.animal_id, adopterId: actor.id });
      return mapApp(upd.rows[0]);
    });
  }

  // ── Return (after trial or after adoption) ───────────────────────────────
  async handleReturn(actor: AuthenticatedUser, applicationId: string, reason: string): Promise<AdoptionApplicationRecord> {
    if (!["ngo","govt","admin"].includes(actor.role)) throw new AppError("Only NGOs and admins can process returns", 403, "FORBIDDEN");
    const r = await query<AppRow>(`SELECT * FROM adoption_applications WHERE id = $1 FOR UPDATE`, [applicationId]);
    const app = r.rows[0];
    if (!app) throw new AppError("Application not found", 404, "NOT_FOUND");
    if (!["trial","adopted"].includes(app.status)) throw new AppError("Can only process returns for active trials or adoptions", 422, "INVALID_STATE");

    return withTransaction(async (client) => {
      const upd = await client.query<AppRow>(
        `UPDATE adoption_applications SET status='returned',rejection_reason=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,
        [applicationId, reason]
      );
      await client.query(`UPDATE animals SET status='found', updated_at=NOW() WHERE id=$1`, [app.animal_id]);
      return mapApp(upd.rows[0]);
    });
  }

  // ── Post-adoption follow-up ──────────────────────────────────────────────
  async recordFollowup(actor: AuthenticatedUser, applicationId: string, notes: string): Promise<AdoptionApplicationRecord> {
    if (!["ngo","govt","admin"].includes(actor.role)) throw new AppError("Only NGOs and admins can record follow-ups", 403, "FORBIDDEN");
    const upd = await query<AppRow>(
      `UPDATE adoption_applications SET followup_done_at=NOW(),followup_notes=$2,updated_at=NOW() WHERE id=$1 AND status='adopted' RETURNING *`,
      [applicationId, notes]
    );
    if (!upd.rows[0]) throw new AppError("Application not found or not in adopted status", 404, "NOT_FOUND");
    return mapApp(upd.rows[0]);
  }

  // ── Blacklist ────────────────────────────────────────────────────────────
  async addToBlacklist(actor: AuthenticatedUser, input: { userId?: string | null; phone?: string | null; reason: string }) {
    if (!["ngo","govt","admin"].includes(actor.role)) throw new AppError("Only NGOs and admins can manage the blacklist", 403, "FORBIDDEN");
    if (!input.userId && !input.phone) throw new AppError("Either userId or phone must be provided", 422, "MISSING_IDENTIFIER");
    const r = await query<{ id: string; user_id: string | null; phone: string | null; reason: string; flagged_at: Date; is_active: boolean }>(
      `INSERT INTO adopter_blacklist (user_id,phone,reason,flagged_by_user_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [input.userId ?? null, input.phone ?? null, input.reason, actor.id]
    );
    logger.info("Added to adopter blacklist", { flaggedBy: actor.id, phone: input.phone });
    return r.rows[0];
  }

  // ── List applications ────────────────────────────────────────────────────
  async list(actor: AuthenticatedUser, filters?: { status?: AdoptionStatus; animalId?: string }): Promise<AdoptionApplicationRecord[]> {
    const conds: string[] = ["1=1"];
    const vals: unknown[] = [];
    if (!["ngo","govt","admin"].includes(actor.role)) { vals.push(actor.id); conds.push(`aa.applicant_user_id = $${vals.length}`); }
    if (filters?.status) { vals.push(filters.status); conds.push(`aa.status = $${vals.length}`); }
    if (filters?.animalId) { vals.push(filters.animalId); conds.push(`aa.animal_id = $${vals.length}`); }
    const r = await query<AppRow>(`SELECT * FROM adoption_applications aa WHERE ${conds.join(" AND ")} ORDER BY aa.created_at DESC LIMIT 100`, vals);
    return r.rows.map(mapApp);
  }

  // ── Get by ID ────────────────────────────────────────────────────────────
  async getById(actor: AuthenticatedUser, applicationId: string): Promise<AdoptionApplicationRecord> {
    const r = await query<AppRow>(`SELECT * FROM adoption_applications WHERE id = $1 LIMIT 1`, [applicationId]);
    const app = r.rows[0];
    if (!app) throw new AppError("Application not found", 404, "NOT_FOUND");
    if (!["ngo","govt","admin"].includes(actor.role) && app.applicant_user_id !== actor.id)
      throw new AppError("Access denied", 403, "FORBIDDEN");
    return mapApp(app);
  }
}

export const adoptionService = new AdoptionService();
