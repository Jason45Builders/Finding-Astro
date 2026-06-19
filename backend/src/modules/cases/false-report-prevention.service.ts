import { query } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser } from "../../types/global.types";
import { logger } from "../../utils/logger";

const MIN_ACCOUNT_AGE_DAYS = 30;
const MIN_CREDIBILITY = 60;
const BURST_WINDOW_HOURS = 1;
const BURST_MAX_REPORTS = 3;
const CLUSTER_RADIUS_M = 500;
const CLUSTER_WINDOW_DAYS = 7;
const CLUSTER_MIN_REPORTS = 3;

export type ReportVerdict = "approved" | "quarantined" | "blocked";
export interface FalseReportCheck {
  verdict: ReportVerdict;
  reason: string;
  quarantinedForReview: boolean;
}

class FalseReportPreventionService {
  async checkReportPermission(
    actor: AuthenticatedUser,
    input: { caseType: string; priority: string; location: { latitude: number; longitude: number } }
  ): Promise<FalseReportCheck> {
    const highStake = input.caseType === "abuse" ||
      (input.caseType === "conflict" && input.priority === "high");
    if (!highStake) {
      return { verdict: "approved", reason: "Low-stakes report", quarantinedForReview: false };
    }

    const ageResult = await query<{ days: number; cred: number }>(
      `SELECT EXTRACT(DAY FROM NOW() - created_at)::int AS days,
              COALESCE(report_credibility_score, 100) AS cred
       FROM users WHERE id = $1`, [actor.id]
    );
    const days = ageResult.rows[0]?.days ?? 0;
    const cred = ageResult.rows[0]?.cred ?? 100;

    if (days < MIN_ACCOUNT_AGE_DAYS) {
      logger.warn("New account high-severity report quarantined", { userId: actor.id, days });
      return { verdict: "quarantined", reason: `Account is ${days} day(s) old. Requires 30-day account for high-severity reports.`, quarantinedForReview: true };
    }
    if (cred < MIN_CREDIBILITY) {
      logger.warn("Low credibility reporter quarantined", { userId: actor.id, cred });
      return { verdict: "quarantined", reason: "Your report has been received and will be reviewed manually.", quarantinedForReview: true };
    }

    const burstResult = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM cases
       WHERE reporter_user_id = $1 AND case_type IN ('abuse','conflict')
         AND created_at > NOW() - ($2 || ' hours')::interval`,
      [actor.id, BURST_WINDOW_HOURS]
    );
    const burst = Number(burstResult.rows[0]?.n ?? 0);
    if (burst >= BURST_MAX_REPORTS) {
      return { verdict: "blocked", reason: `${burst} reports in last hour. Please wait before submitting more.`, quarantinedForReview: false };
    }

    const clusterResult = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM cases
       WHERE case_type IN ('abuse','conflict')
         AND created_at > NOW() - ($1 || ' days')::interval
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($2,$3),4326)::geography, $4)`,
      [CLUSTER_WINDOW_DAYS, input.location.longitude, input.location.latitude, CLUSTER_RADIUS_M]
    );
    if (Number(clusterResult.rows[0]?.n ?? 0) >= CLUSTER_MIN_REPORTS) {
      return { verdict: "quarantined", reason: "Multiple reports in this area are under review.", quarantinedForReview: true };
    }

    return { verdict: "approved", reason: "All checks passed", quarantinedForReview: false };
  }

  async markReportUnfounded(
    actor: AuthenticatedUser,
    opts: { caseId: string; reporterUserId: string; reason: string }
  ): Promise<void> {
    if (!["ngo", "govt", "admin"].includes(actor.role)) {
      throw new AppError("Only NGOs and government can mark reports as unfounded", 403, "FORBIDDEN");
    }
    await query(
      `UPDATE users SET report_credibility_score = GREATEST(0, COALESCE(report_credibility_score,100)-15), updated_at=NOW() WHERE id=$1`,
      [opts.reporterUserId]
    );
    await query(
      `INSERT INTO volunteer_activity_logs(user_id,activity_type,reference_id,notes,points_delta) VALUES($1,'report_marked_unfounded',$2,$3,-15)`,
      [opts.reporterUserId, opts.caseId, opts.reason]
    );
  }

  async confirmReportAccurate(reporterUserId: string, caseId: string): Promise<void> {
    await query(
      `UPDATE users SET report_credibility_score=LEAST(100,COALESCE(report_credibility_score,100)+5), updated_at=NOW() WHERE id=$1`,
      [reporterUserId]
    );
    await query(
      `INSERT INTO volunteer_activity_logs(user_id,activity_type,reference_id,notes,points_delta) VALUES($1,'report_confirmed_accurate',$2,'Verified by NGO',5)`,
      [reporterUserId, caseId]
    );
  }
}

export const falseReportPreventionService = new FalseReportPreventionService();
