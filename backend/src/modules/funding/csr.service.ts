/**
 * csr.service.ts
 * CSR (Corporate Social Responsibility) funding system.
 * Expert advice: "CSR won't fund 'help dogs'. It will fund an operating system
 * that makes help measurable, controlled, and scalable."
 *
 * Implements:
 *   - Sponsor registration and management
 *   - Ward-level monthly budgets
 *   - Case allocation from CSR pool
 *   - Matching fund (company matches public donations 1:1 up to a cap)
 *   - Impact reporting (cases funded, ₹ allocated, outcomes)
 *
 * PLACE AT: backend/src/modules/funding/csr.service.ts
 */

import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser } from "../../types/global.types";
import { logger } from "../../utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CsrSponsorRecord {
  id: string; orgName: string; contactName: string | null; contactEmail: string | null;
  contactPhone: string | null; registrationNumber: string | null;
  commitmentType: "pooled" | "ward" | "module" | "matching";
  committedAmountInr: number; disbursedAmountInr: number;
  matchingRatio: number | null; matchingCapInr: number | null;
  activeFrom: string; activeUntil: string | null; isActive: boolean;
  notes: string | null; createdAt: Date; updatedAt: Date;
}

export interface CsrWardSponsorshipRecord {
  id: string; sponsorId: string; wardName: string;
  monthlyBudgetInr: number; month: string; spentInr: number;
  caseCount: number; isActive: boolean; remainingBudget: number; createdAt: Date;
}

export interface CsrTransactionRecord {
  id: string; sponsorId: string; fundingCaseId: string | null; caseId: string | null;
  wardName: string | null; amountInr: number;
  transactionType: "case_allocation" | "matching" | "transport" | "recovery" | "ward_pool";
  referenceNote: string | null; isMatching: boolean; createdAt: Date;
}

export interface CsrImpactReport {
  sponsorId: string; orgName: string; commitmentType: string;
  committedAmountInr: number; disbursedAmountInr: number; totalAllocatedInr: number;
  casesFunded: number; firstAllocationAt: Date | null; latestAllocationAt: Date | null;
  remainingBudget: number; utilizationPct: number;
}

interface SponsorRow {
  id: string; org_name: string; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; registration_number: string | null; commitment_type: string;
  committed_amount_inr: string; disbursed_amount_inr: string; matching_ratio: string | null;
  matching_cap_inr: string | null; active_from: string; active_until: string | null;
  is_active: boolean; notes: string | null; created_at: Date; updated_at: Date;
}

interface WardRow {
  id: string; sponsor_id: string; ward_name: string; monthly_budget_inr: string;
  month: string; spent_inr: string; case_count: number; is_active: boolean; created_at: Date;
}

interface TxRow {
  id: string; sponsor_id: string; funding_case_id: string | null; case_id: string | null;
  ward_name: string | null; amount_inr: string; transaction_type: string;
  reference_note: string | null; is_matching: boolean; created_at: Date;
}

const mapSponsor = (r: SponsorRow): CsrSponsorRecord => ({
  id: r.id, orgName: r.org_name, contactName: r.contact_name, contactEmail: r.contact_email,
  contactPhone: r.contact_phone, registrationNumber: r.registration_number,
  commitmentType: r.commitment_type as CsrSponsorRecord["commitmentType"],
  committedAmountInr: Number(r.committed_amount_inr), disbursedAmountInr: Number(r.disbursed_amount_inr),
  matchingRatio: r.matching_ratio !== null ? Number(r.matching_ratio) : null,
  matchingCapInr: r.matching_cap_inr !== null ? Number(r.matching_cap_inr) : null,
  activeFrom: r.active_from, activeUntil: r.active_until, isActive: r.is_active,
  notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapWard = (r: WardRow): CsrWardSponsorshipRecord => ({
  id: r.id, sponsorId: r.sponsor_id, wardName: r.ward_name,
  monthlyBudgetInr: Number(r.monthly_budget_inr), month: r.month,
  spentInr: Number(r.spent_inr), caseCount: r.case_count, isActive: r.is_active,
  remainingBudget: Number(r.monthly_budget_inr) - Number(r.spent_inr),
  createdAt: r.created_at,
});

const mapTx = (r: TxRow): CsrTransactionRecord => ({
  id: r.id, sponsorId: r.sponsor_id, fundingCaseId: r.funding_case_id, caseId: r.case_id,
  wardName: r.ward_name, amountInr: Number(r.amount_inr),
  transactionType: r.transaction_type as CsrTransactionRecord["transactionType"],
  referenceNote: r.reference_note, isMatching: r.is_matching, createdAt: r.created_at,
});

// ─── Service ──────────────────────────────────────────────────────────────────
class CsrService {

  // ── Register a sponsor (admin only) ───────────────────────────────────────
  async registerSponsor(
    actor: AuthenticatedUser,
    input: {
      orgName: string; contactName?: string | null; contactEmail?: string | null;
      contactPhone?: string | null; registrationNumber?: string | null;
      commitmentType: "pooled" | "ward" | "module" | "matching";
      committedAmountInr: number;
      matchingRatio?: number | null; matchingCapInr?: number | null;
      activeFrom?: string; activeUntil?: string | null; notes?: string | null;
    }
  ): Promise<CsrSponsorRecord> {
    if (actor.role !== "admin") throw new AppError("Only admins can register sponsors", 403, "FORBIDDEN");

    const result = await query<SponsorRow>(
      `INSERT INTO csr_sponsors (org_name,contact_name,contact_email,contact_phone,registration_number,
         commitment_type,committed_amount_inr,matching_ratio,matching_cap_inr,active_from,active_until,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [input.orgName, input.contactName ?? null, input.contactEmail ?? null,
       input.contactPhone ?? null, input.registrationNumber ?? null,
       input.commitmentType, input.committedAmountInr,
       input.matchingRatio ?? null, input.matchingCapInr ?? null,
       input.activeFrom ?? new Date().toISOString().slice(0, 10),
       input.activeUntil ?? null, input.notes ?? null]
    );
    logger.info("CSR sponsor registered", { sponsorId: result.rows[0].id, orgName: input.orgName });
    return mapSponsor(result.rows[0]);
  }

  // ── Create ward sponsorship ────────────────────────────────────────────────
  async createWardSponsorship(
    actor: AuthenticatedUser,
    input: { sponsorId: string; wardName: string; monthlyBudgetInr: number; month: string }
  ): Promise<CsrWardSponsorshipRecord> {
    if (actor.role !== "admin") throw new AppError("Only admins can create ward sponsorships", 403, "FORBIDDEN");

    const result = await query<WardRow>(
      `INSERT INTO csr_ward_sponsorships (sponsor_id, ward_name, monthly_budget_inr, month)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (sponsor_id, ward_name, month)
       DO UPDATE SET monthly_budget_inr = EXCLUDED.monthly_budget_inr, is_active = TRUE
       RETURNING *`,
      [input.sponsorId, input.wardName, input.monthlyBudgetInr, input.month]
    );
    return mapWard(result.rows[0]);
  }

  // ── Allocate CSR funds to a case ─────────────────────────────────────────
  async allocateToCse(
    actor: AuthenticatedUser,
    input: {
      sponsorId: string; caseId: string;
      amountInr: number; fundingCaseId?: string | null;
      wardName?: string | null;
      transactionType?: CsrTransactionRecord["transactionType"];
      referenceNote?: string | null;
    }
  ): Promise<CsrTransactionRecord> {
    if (actor.role !== "admin") throw new AppError("Only admins can allocate CSR funds", 403, "FORBIDDEN");

    return withTransaction(async (client) => {
      // Check sponsor budget
      const sponsor = await client.query<{ committed_amount_inr: string; disbursed_amount_inr: string; is_active: boolean }>(
        `SELECT committed_amount_inr, disbursed_amount_inr, is_active FROM csr_sponsors WHERE id = $1 FOR UPDATE`,
        [input.sponsorId]
      );
      if (!sponsor.rows[0]) throw new AppError("Sponsor not found", 404, "NOT_FOUND");
      if (!sponsor.rows[0].is_active) throw new AppError("Sponsor is not active", 422, "SPONSOR_INACTIVE");

      const remaining = Number(sponsor.rows[0].committed_amount_inr) - Number(sponsor.rows[0].disbursed_amount_inr);
      if (input.amountInr > remaining) {
        throw new AppError(`Insufficient sponsor budget. Available: ₹${remaining.toFixed(2)}`, 422, "INSUFFICIENT_BUDGET");
      }

      // Create transaction
      const tx = await client.query<TxRow>(
        `INSERT INTO csr_transactions (sponsor_id,funding_case_id,case_id,ward_name,amount_inr,transaction_type,reference_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [input.sponsorId, input.fundingCaseId ?? null, input.caseId, input.wardName ?? null,
         input.amountInr, input.transactionType ?? "case_allocation", input.referenceNote ?? null]
      );

      // Update sponsor disbursed amount
      await client.query(
        `UPDATE csr_sponsors SET disbursed_amount_inr = disbursed_amount_inr + $2, updated_at = NOW() WHERE id = $1`,
        [input.sponsorId, input.amountInr]
      );

      // Update ward spending if ward name provided
      if (input.wardName) {
        const month = new Date().toISOString().slice(0, 7);
        await client.query(
          `UPDATE csr_ward_sponsorships
           SET spent_inr = spent_inr + $3, case_count = case_count + 1
           WHERE sponsor_id = $1 AND ward_name = $2 AND month = $4 AND is_active = TRUE`,
          [input.sponsorId, input.wardName, input.amountInr, month]
        );
      }

      return mapTx(tx.rows[0]);
    });
  }

  // ── Trigger matching fund on a public donation ────────────────────────────
  // Called after a successful public donation to check if a matching sponsor exists
  async triggerMatching(
    fundingCaseId: string,
    publicDonationAmount: number,
    donorUserId: string,
    caseId: string,
    wardName?: string | null
  ): Promise<CsrTransactionRecord | null> {
    // Find an active matching sponsor
    const sponsorResult = await query<SponsorRow & { disbursed: string; committed: string }>(
      `SELECT s.*, s.disbursed_amount_inr AS disbursed, s.committed_amount_inr AS committed
       FROM csr_sponsors s
       WHERE s.is_active = TRUE
         AND s.commitment_type = 'matching'
         AND s.matching_ratio IS NOT NULL
         AND s.active_from <= CURRENT_DATE
         AND (s.active_until IS NULL OR s.active_until >= CURRENT_DATE)
         AND s.disbursed_amount_inr < s.committed_amount_inr
       ORDER BY s.active_from ASC
       LIMIT 1`
    );

    if (!sponsorResult.rows[0]) return null;

    const sponsor = sponsorResult.rows[0];
    const matchAmount = Math.min(
      publicDonationAmount * Number(sponsor.matching_ratio ?? 1),
      sponsor.matching_cap_inr ? Number(sponsor.matching_cap_inr) : Infinity,
      Number(sponsor.committed) - Number(sponsor.disbursed)
    );

    if (matchAmount <= 0) return null;

    return withTransaction(async (client) => {
      // Record matching transaction
      const tx = await client.query<TxRow>(
        `INSERT INTO csr_transactions (sponsor_id,funding_case_id,case_id,ward_name,amount_inr,transaction_type,reference_note,is_matching)
         VALUES ($1,$2,$3,$4,$5,'matching','Matched public donation',TRUE) RETURNING *`,
        [sponsor.id, fundingCaseId, caseId, wardName ?? null, matchAmount]
      );

      // Update sponsor disbursed
      await client.query(
        `UPDATE csr_sponsors SET disbursed_amount_inr = disbursed_amount_inr + $2, updated_at = NOW() WHERE id = $1`,
        [sponsor.id, matchAmount]
      );

      // Apply match to the funding case
      await client.query(
        `UPDATE funding_cases
         SET amount_raised = amount_raised + $2,
             status = CASE WHEN (amount_raised + $2) >= total_amount THEN 'CLOSED' ELSE status END
         WHERE id = $1`,
        [fundingCaseId, matchAmount]
      );

      // Mark the original donation as matched
      await client.query(
        `UPDATE funding_transactions
         SET is_matched = TRUE, matched_by_sponsor_id = $2, matched_amount = $3
         WHERE funding_case_id = $1 AND user_id = $4 AND is_matched = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [fundingCaseId, sponsor.id, matchAmount, donorUserId]
      );

      logger.info("Matching fund triggered", { sponsorId: sponsor.id, matchAmount, fundingCaseId });
      return mapTx(tx.rows[0]);
    });
  }

  // ── Get impact report (public transparency) ───────────────────────────────
  async getImpactReport(): Promise<CsrImpactReport[]> {
    const result = await query<{
      sponsor_id: string; org_name: string; commitment_type: string;
      committed_amount_inr: string; disbursed_amount_inr: string;
      total_allocated_inr: string; cases_funded: string;
      first_allocation_at: Date | null; latest_allocation_at: Date | null;
    }>(`SELECT * FROM csr_impact_summary ORDER BY total_allocated_inr DESC`);

    return result.rows.map(r => ({
      sponsorId: r.sponsor_id, orgName: r.org_name, commitmentType: r.commitment_type,
      committedAmountInr: Number(r.committed_amount_inr), disbursedAmountInr: Number(r.disbursed_amount_inr),
      totalAllocatedInr: Number(r.total_allocated_inr), casesFunded: Number(r.cases_funded),
      firstAllocationAt: r.first_allocation_at, latestAllocationAt: r.latest_allocation_at,
      remainingBudget: Number(r.committed_amount_inr) - Number(r.disbursed_amount_inr),
      utilizationPct: Number(r.committed_amount_inr) > 0
        ? Math.round((Number(r.disbursed_amount_inr) / Number(r.committed_amount_inr)) * 100)
        : 0,
    }));
  }

  // ── List all sponsors ─────────────────────────────────────────────────────
  async listSponsors(): Promise<CsrSponsorRecord[]> {
    const result = await query<SponsorRow>(`SELECT * FROM csr_sponsors WHERE is_active = TRUE ORDER BY org_name ASC`);
    return result.rows.map(mapSponsor);
  }

  // ── Ward sponsorships for a given month ───────────────────────────────────
  async listWardSponsorships(month?: string): Promise<CsrWardSponsorshipRecord[]> {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const result = await query<WardRow>(
      `SELECT * FROM csr_ward_sponsorships WHERE month = $1 AND is_active = TRUE ORDER BY ward_name`,
      [targetMonth]
    );
    return result.rows.map(mapWard);
  }
}

export const csrService = new CsrService();
