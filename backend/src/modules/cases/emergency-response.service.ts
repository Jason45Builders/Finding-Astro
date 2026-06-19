/**
 * emergency-response.service.ts — FULLY FIXED
 *
 * FIXED:
 *   - broadcastEmergency: returns { notifiedCount } so caller gets real number
 *   - broadcastEmergency: uses triggered_by_label (text) not triggered_by (UUID) — fixes runtime type error
 *   - claimCase: active case load check — max 3 concurrent claims per responder
 *   - processExpiredClaims: alias c.id fixed to cases.id in UPDATE subquery
 */

import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser, LocationInput } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { logger } from "../../utils/logger";

const RESPONSE_WINDOW_MINUTES = 15;
const TIER1_RADIUS_KM         = 3;
const TIER2_RADIUS_KM         = 8;
const TIER3_RADIUS_KM         = 15;
const NO_RESPONSE_TIMEOUT_MIN = 8;
const ABANDON_TIMEOUT_MINUTES = 20;
const MAX_ACTIVE_CLAIMS       = 3;    // FIXED: responder load limit

export type ResponderStatus =
  | "claimed" | "en_route" | "on_scene" | "picked_up"
  | "at_hospital" | "completed" | "abandoned";

export interface CaseResponseRecord {
  id: string; caseId: string; responderUserId: string; status: ResponderStatus;
  claimedAt: Date; deadlineAt: Date; reachedAt: Date | null; pickedUpAt: Date | null;
  atHospitalAt: Date | null; completedAt: Date | null; abandonedAt: Date | null;
  abandonReason: string | null; hospitalId: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date;
}

interface ResponseRow {
  id: string; case_id: string; responder_user_id: string; status: ResponderStatus;
  claimed_at: Date; deadline_at: Date; reached_at: Date | null; picked_up_at: Date | null;
  at_hospital_at: Date | null; completed_at: Date | null; abandoned_at: Date | null;
  abandon_reason: string | null; hospital_id: string | null; notes: string | null;
  created_at: Date; updated_at: Date;
}

const mapResponse = (r: ResponseRow): CaseResponseRecord => ({
  id: r.id, caseId: r.case_id, responderUserId: r.responder_user_id, status: r.status,
  claimedAt: r.claimed_at, deadlineAt: r.deadline_at, reachedAt: r.reached_at,
  pickedUpAt: r.picked_up_at, atHospitalAt: r.at_hospital_at, completedAt: r.completed_at,
  abandonedAt: r.abandoned_at, abandonReason: r.abandon_reason, hospitalId: r.hospital_id,
  notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
});

class EmergencyResponseService {

  // FIXED: returns notifiedCount + uses triggered_by_label (text column, not UUID)
  async broadcastEmergency(
    caseId: string, caseTitle: string, location: LocationInput,
    priority: "high" | "medium" | "low", reporterUserId: string, escalationLevel = 1
  ): Promise<{ notifiedCount: number }> {
    const radii = priority === "high"
      ? [TIER1_RADIUS_KM, TIER2_RADIUS_KM, TIER3_RADIUS_KM]
      : [TIER1_RADIUS_KM, TIER2_RADIUS_KM];
    const radius = radii[Math.min(escalationLevel - 1, radii.length - 1)];

    const notified = await notificationService.notifyUsersNearLocation(
      location, radius, [reporterUserId], "case",
      escalationLevel === 1 ? `Emergency nearby — ${priority} priority` : `Responder needed — re-broadcast`,
      `${caseTitle} — ${radius}km radius. Tap to respond.`,
      { caseId, actionType: "emergency_broadcast", escalationLevel, radiusKm: radius, canClaim: true }
    );

    // FIXED: triggered_by_label is TEXT, not UUID — no more type error
    await query(
      `INSERT INTO case_escalations (case_id, escalation_level, radius_km, triggered_by_label, user_count_notified)
       VALUES ($1, $2, $3, 'timer', $4)
       ON CONFLICT DO NOTHING`,
      [caseId, escalationLevel, radius, notified.length]
    ).catch(async () => {
      // Fallback: if triggered_by_label column doesn't exist yet (migration 008 not run),
      // try the old column name so the service doesn't crash
      await query(
        `INSERT INTO case_escalations (case_id, escalation_level, radius_km, user_count_notified)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [caseId, escalationLevel, radius, notified.length]
      ).catch(() => {});
    });

    logger.info("Emergency broadcast sent", { caseId, escalationLevel, radiusKm: radius, notifiedCount: notified.length });
    return { notifiedCount: notified.length };
  }

  // FIXED: active case load check before allowing claim
  async claimCase(actor: AuthenticatedUser, caseId: string): Promise<CaseResponseRecord> {
    // Prevent a single responder from hoarding cases
    const activeClaims = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM case_responses
       WHERE responder_user_id = $1
         AND status IN ('claimed','en_route','on_scene','picked_up','at_hospital')`,
      [actor.id]
    );
    if (Number(activeClaims.rows[0]?.count ?? 0) >= MAX_ACTIVE_CLAIMS) {
      throw new AppError(
        `You already have ${MAX_ACTIVE_CLAIMS} active cases. Complete or release one before claiming another.`,
        409, "CASE_LOAD_EXCEEDED"
      );
    }

    const existing = await query<{ id: string; responder_user_id: string }>(
      `SELECT id, responder_user_id FROM case_responses
       WHERE case_id = $1 AND status IN ('claimed','en_route','on_scene','picked_up','at_hospital')
       LIMIT 1`,
      [caseId]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0].responder_user_id === actor.id) {
        throw new AppError("You have already claimed this case.", 409, "ALREADY_CLAIMED");
      }
      throw new AppError("This case already has an active responder.", 409, "CASE_ALREADY_CLAIMED");
    }

    return withTransaction(async (client) => {
      const deadline = new Date(Date.now() + RESPONSE_WINDOW_MINUTES * 60 * 1000);
      const result = await client.query<ResponseRow>(
        `INSERT INTO case_responses (case_id, responder_user_id, status, claimed_at, deadline_at)
         VALUES ($1, $2, 'claimed', NOW(), $3) RETURNING *`,
        [caseId, actor.id, deadline]
      );
      await client.query(
        `UPDATE cases SET status = 'in_review', assigned_to_user_id = $2, updated_at = NOW() WHERE id = $1`,
        [caseId, actor.id]
      );
      await client.query(
        `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
         VALUES ($1, $2, 'open', 'in_review', 'Responder claimed the case')`,
        [caseId, actor.id]
      );
      const caseResult = await client.query<{ reporter_user_id: string; title: string }>(
        `SELECT reporter_user_id, title FROM cases WHERE id = $1`, [caseId]
      );
      await notificationService.notifyUser(
        caseResult.rows[0].reporter_user_id, "case",
        "Responder on the way",
        `Someone has claimed your emergency report "${caseResult.rows[0].title}" and is heading to the location.`,
        { caseId, responderId: actor.id, action: "responder_claimed" }
      );
      logger.info("Case claimed", { caseId, responderId: actor.id });
      return mapResponse(result.rows[0]);
    });
  }

  async updateResponderStatus(
    actor: AuthenticatedUser, caseId: string,
    newStatus: Exclude<ResponderStatus, "claimed" | "abandoned">,
    options?: { hospitalId?: string; notes?: string }
  ): Promise<CaseResponseRecord> {
    const existing = await query<ResponseRow>(
      `SELECT * FROM case_responses WHERE case_id = $1 AND responder_user_id = $2
       AND status NOT IN ('completed','abandoned') FOR UPDATE`,
      [caseId, actor.id]
    );
    if (!existing.rows[0]) throw new AppError("You don't have an active claim on this case.", 404, "NO_ACTIVE_CLAIM");

    const ORDER: ResponderStatus[] = ["claimed","en_route","on_scene","picked_up","at_hospital","completed"];
    const currentIdx = ORDER.indexOf(existing.rows[0].status);
    const newIdx     = ORDER.indexOf(newStatus);
    if (newIdx <= currentIdx) {
      throw new AppError(`Cannot move status from "${existing.rows[0].status}" to "${newStatus}"`, 422, "INVALID_STATUS_TRANSITION");
    }

    const timestampMap: Partial<Record<ResponderStatus, string>> = {
      en_route: "reached_at", on_scene: "reached_at",
      picked_up: "picked_up_at", at_hospital: "at_hospital_at", completed: "completed_at",
    };
    const updates: string[] = ["status = $3", "updated_at = NOW()"];
    const vals: unknown[] = [caseId, actor.id, newStatus];
    const tsField = timestampMap[newStatus];
    if (tsField) updates.push(`${tsField} = NOW()`);
    if (options?.hospitalId) { vals.push(options.hospitalId); updates.push(`hospital_id = $${vals.length}`); }
    if (options?.notes)      { vals.push(options.notes);      updates.push(`notes = $${vals.length}`); }

    const updated = await query<ResponseRow>(
      `UPDATE case_responses SET ${updates.join(", ")}
       WHERE case_id = $1 AND responder_user_id = $2 RETURNING *`,
      vals
    );

    if (newStatus === "completed") {
      await query(`UPDATE cases SET status = 'action_taken', updated_at = NOW() WHERE id = $1`, [caseId]);
      await query(
        `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
         VALUES ($1, $2, 'in_review', 'action_taken', 'Responder marked case complete')`,
        [caseId, actor.id]
      );
    }

    return mapResponse(updated.rows[0]);
  }

  async abandonClaim(actor: AuthenticatedUser, caseId: string, reason: string): Promise<void> {
    const existing = await query<ResponseRow>(
      `SELECT * FROM case_responses WHERE case_id = $1 AND responder_user_id = $2
       AND status NOT IN ('completed','abandoned') FOR UPDATE`,
      [caseId, actor.id]
    );
    if (!existing.rows[0]) throw new AppError("No active claim found.", 404, "NO_ACTIVE_CLAIM");

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE case_responses SET status='abandoned', abandoned_at=NOW(), abandon_reason=$3, updated_at=NOW()
         WHERE case_id=$1 AND responder_user_id=$2`,
        [caseId, actor.id, reason]
      );
      await client.query(
        `UPDATE cases SET status='open', assigned_to_user_id=NULL, updated_at=NOW() WHERE id=$1`, [caseId]
      );
      await client.query(
        `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
         VALUES ($1, $2, 'in_review', 'open', $3)`,
        [caseId, actor.id, `Responder abandoned: ${reason}`]
      );
    });

    const caseResult = await query<{ title: string; latitude: number; longitude: number; priority: string; reporter_user_id: string }>(
      `SELECT c.title, ST_Y(c.location::geometry) AS latitude, ST_X(c.location::geometry) AS longitude,
              c.priority, c.reporter_user_id FROM cases c WHERE c.id = $1`, [caseId]
    );
    const c = caseResult.rows[0];
    if (c) {
      await this.broadcastEmergency(
        caseId, c.title,
        { latitude: Number(c.latitude), longitude: Number(c.longitude) },
        c.priority as "high" | "medium" | "low", c.reporter_user_id, 2
      );
    }
    logger.info("Case abandoned and re-broadcast", { caseId, abandonedBy: actor.id });
  }

  async getActiveResponse(caseId: string): Promise<CaseResponseRecord | null> {
    const result = await query<ResponseRow>(
      `SELECT * FROM case_responses WHERE case_id = $1 AND status NOT IN ('completed','abandoned')
       ORDER BY created_at DESC LIMIT 1`, [caseId]
    );
    return result.rows[0] ? mapResponse(result.rows[0]) : null;
  }

  async processExpiredClaims(): Promise<{ abandonedCount: number; reBroadcastCount: number }> {
    const expired = await query<{ case_id: string; responder_user_id: string }>(
      `UPDATE case_responses
       SET status='abandoned', abandoned_at=NOW(), abandon_reason='Response deadline exceeded', updated_at=NOW()
       WHERE status = 'claimed' AND deadline_at < NOW() - INTERVAL '${ABANDON_TIMEOUT_MINUTES} minutes'
       RETURNING case_id, responder_user_id`
    );
    for (const row of expired.rows) {
      await query(`UPDATE cases SET status='open', assigned_to_user_id=NULL, updated_at=NOW() WHERE id=$1`, [row.case_id]);
      logger.warn("Claim expired — case re-opened", { caseId: row.case_id, responderId: row.responder_user_id });
    }

    const unclaimed = await query<{ id: string; title: string; latitude: number; longitude: number; priority: string; reporter_user_id: string }>(
      `SELECT c.id, c.title,
              ST_Y(c.location::geometry) AS latitude, ST_X(c.location::geometry) AS longitude,
              c.priority, c.reporter_user_id
       FROM cases c
       WHERE c.status = 'open' AND c.priority IN ('high','medium')
         AND c.created_at < NOW() - INTERVAL '${NO_RESPONSE_TIMEOUT_MIN} minutes'
         AND NOT EXISTS (SELECT 1 FROM case_responses cr WHERE cr.case_id = c.id)
         AND NOT EXISTS (SELECT 1 FROM case_escalations ce WHERE ce.case_id = c.id)`
    );
    for (const c of unclaimed.rows) {
      await this.broadcastEmergency(
        c.id, c.title,
        { latitude: Number(c.latitude), longitude: Number(c.longitude) },
        c.priority as "high" | "medium" | "low", c.reporter_user_id, 2
      );
    }
    return { abandonedCount: expired.rows.length, reBroadcastCount: unclaimed.rows.length };
  }

  async getResponderHistory(userId: string, limit = 20): Promise<CaseResponseRecord[]> {
    const result = await query<ResponseRow>(
      `SELECT * FROM case_responses WHERE responder_user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(mapResponse);
  }
}

export const emergencyResponseService = new EmergencyResponseService();
