/**
 * recovery-transport.service.ts
 * Funding lanes 4 (Transport) and 5 (Recovery) from the expert conversation.
 *
 * Transport: Fixed slab pricing shown before request. Funded by responder, case pool, or CSR.
 * Recovery: Daily cost attached to a case. "Recovery: ₹X/day" visible on case page.
 *
 * PLACE AT: backend/src/modules/funding/recovery-transport.service.ts
 */

import { query } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser } from "../../types/global.types";

// ─── Transport Slab ───────────────────────────────────────────────────────────
export interface TransportSlab {
  id: string; label: string; amountInr: number; maxDistKm: number | null;
  vehicleType: string; isActive: boolean;
}

interface SlabRow { id: string; label: string; amount_inr: string; max_dist_km: string | null; vehicle_type: string; is_active: boolean; }

const mapSlab = (r: SlabRow): TransportSlab => ({
  id: r.id, label: r.label, amountInr: Number(r.amount_inr),
  maxDistKm: r.max_dist_km !== null ? Number(r.max_dist_km) : null,
  vehicleType: r.vehicle_type, isActive: r.is_active,
});

// ─── Recovery Funding ─────────────────────────────────────────────────────────
export interface RecoveryFundingRecord {
  id: string; caseId: string; animalId: string | null;
  providerName: string | null; providerType: "foster" | "ngo_shelter" | "clinic";
  dailyCostInr: number; startDate: string; endDate: string | null;
  totalRaisedInr: number; status: "active" | "completed" | "cancelled";
  createdByUserId: string | null; createdAt: Date; updatedAt: Date;
  daysElapsed: number; totalCostSoFar: number;
}

interface RecoveryRow {
  id: string; case_id: string; animal_id: string | null; provider_name: string | null;
  provider_type: string; daily_cost_inr: string; start_date: string; end_date: string | null;
  total_raised_inr: string; status: string; created_by_user_id: string | null;
  created_at: Date; updated_at: Date;
}

const mapRecovery = (r: RecoveryRow): RecoveryFundingRecord => {
  const start = new Date(r.start_date);
  const end = r.end_date ? new Date(r.end_date) : new Date();
  const daysElapsed = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
  const dailyCost = Number(r.daily_cost_inr);
  return {
    id: r.id, caseId: r.case_id, animalId: r.animal_id,
    providerName: r.provider_name, providerType: r.provider_type as RecoveryFundingRecord["providerType"],
    dailyCostInr: dailyCost, startDate: r.start_date, endDate: r.end_date,
    totalRaisedInr: Number(r.total_raised_inr), status: r.status as RecoveryFundingRecord["status"],
    createdByUserId: r.created_by_user_id, createdAt: r.created_at, updatedAt: r.updated_at,
    daysElapsed, totalCostSoFar: daysElapsed * dailyCost,
  };
};

class RecoveryTransportService {

  // ── TRANSPORT: Get all active slabs ──────────────────────────────────────
  // Shown to the user BEFORE they submit a transport request ("₹250 for auto")
  async getTransportSlabs(): Promise<TransportSlab[]> {
    const result = await query<SlabRow>(
      `SELECT * FROM transport_slabs WHERE is_active = TRUE ORDER BY amount_inr ASC`
    );
    return result.rows.map(mapSlab);
  }

  async getSlabById(slabId: string): Promise<TransportSlab> {
    const result = await query<SlabRow>(`SELECT * FROM transport_slabs WHERE id = $1 LIMIT 1`, [slabId]);
    if (!result.rows[0]) throw new AppError("Transport slab not found", 404, "NOT_FOUND");
    return mapSlab(result.rows[0]);
  }

  // ── Link a slab to a transport request ───────────────────────────────────
  async linkSlabToTransport(
    transportRequestId: string,
    slabId: string,
    fundingSource: "responder" | "case_pool" | "csr_pool"
  ): Promise<void> {
    const slab = await this.getSlabById(slabId);
    await query(
      `UPDATE transport_requests
       SET slab_id = $2, funding_source = $3, slab_amount_inr = $4, updated_at = NOW()
       WHERE id = $1`,
      [transportRequestId, slabId, fundingSource, slab.amountInr]
    );
  }

  // ── RECOVERY: Create a recovery funding record ────────────────────────────
  // Called when a rescued animal goes to a foster / NGO shelter / clinic for recovery
  async createRecoveryFunding(
    actor: AuthenticatedUser,
    input: {
      caseId: string; animalId?: string | null;
      providerName?: string | null;
      providerType: "foster" | "ngo_shelter" | "clinic";
      dailyCostInr: number;
      startDate?: string;
    }
  ): Promise<RecoveryFundingRecord> {
    if (!["ngo", "govt", "admin", "hospital"].includes(actor.role)) {
      throw new AppError("Only NGOs, hospitals, and admins can create recovery records", 403, "FORBIDDEN");
    }

    // Fosters are usually free — that's fine, dailyCostInr = 0 is allowed
    const result = await query<RecoveryRow>(
      `INSERT INTO recovery_funding (case_id,animal_id,provider_name,provider_type,daily_cost_inr,start_date,created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [input.caseId, input.animalId ?? null, input.providerName ?? null,
       input.providerType, input.dailyCostInr,
       input.startDate ?? new Date().toISOString().slice(0, 10), actor.id]
    );
    return mapRecovery(result.rows[0]);
  }

  // ── Close recovery (animal discharged / returned) ─────────────────────────
  async closeRecovery(
    actor: AuthenticatedUser,
    recoveryId: string,
    status: "completed" | "cancelled"
  ): Promise<RecoveryFundingRecord> {
    if (!["ngo", "govt", "admin", "hospital"].includes(actor.role)) {
      throw new AppError("Only NGOs and admins can close recovery records", 403, "FORBIDDEN");
    }

    const result = await query<RecoveryRow>(
      `UPDATE recovery_funding
       SET status = $2, end_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [recoveryId, status]
    );
    if (!result.rows[0]) throw new AppError("Recovery record not found or not active", 404, "NOT_FOUND");
    return mapRecovery(result.rows[0]);
  }

  // ── Get all recovery records for a case ───────────────────────────────────
  async listForCase(caseId: string): Promise<RecoveryFundingRecord[]> {
    const result = await query<RecoveryRow>(
      `SELECT * FROM recovery_funding WHERE case_id = $1 ORDER BY start_date ASC`,
      [caseId]
    );
    return result.rows.map(mapRecovery);
  }

  // ── Record a donation toward recovery costs ───────────────────────────────
  async donateToRecovery(recoveryId: string, amountInr: number): Promise<RecoveryFundingRecord> {
    const result = await query<RecoveryRow>(
      `UPDATE recovery_funding
       SET total_raised_inr = total_raised_inr + $2, updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [recoveryId, amountInr]
    );
    if (!result.rows[0]) throw new AppError("Recovery record not found or not active", 404, "NOT_FOUND");
    return mapRecovery(result.rows[0]);
  }
}

export const recoveryTransportService = new RecoveryTransportService();
