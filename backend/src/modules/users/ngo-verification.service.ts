import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser, UserRole } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { logger } from "../../utils/logger";

const PRIVILEGED_ORG_ROLES: UserRole[] = ["ngo", "govt", "hospital"];

class NgoVerificationService {
  /** User submits their org details — does NOT change role yet, queues for admin review */
  async submitVerificationRequest(
    actor: AuthenticatedUser,
    input: { requestedRole: UserRole; orgRegistrationNumber: string; orgName: string; supportingDocUrl: string }
  ): Promise<void> {
    if (!PRIVILEGED_ORG_ROLES.includes(input.requestedRole)) {
      throw new AppError(`Role "${input.requestedRole}" does not require verification`, 422, "INVALID_ROLE_REQUEST");
    }

    const existing = await query<{ is_verified_org: boolean }>(
      `SELECT is_verified_org FROM users WHERE id = $1`, [actor.id]
    );
    if (existing.rows[0]?.is_verified_org) {
      throw new AppError("Organisation already verified", 409, "ALREADY_VERIFIED");
    }

    await query(
      `UPDATE users SET org_registration_number = $2, full_name = COALESCE(full_name, $3), updated_at = NOW() WHERE id = $1`,
      [actor.id, input.orgRegistrationNumber, input.orgName]
    );

    await query(
      `INSERT INTO volunteer_activity_logs (user_id, activity_type, notes, points_delta) VALUES ($1, 'org_verification_request', $2, 0)`,
      [actor.id, JSON.stringify(input)]
    );

    logger.info("Org verification request submitted", { userId: actor.id });
  }

  /** Admin approves or rejects — ONLY way to get a privileged role */
  async approveVerification(
    admin: AuthenticatedUser,
    targetUserId: string,
    options: { approved: boolean; grantRole: UserRole; rejectionReason?: string }
  ): Promise<void> {
    if (admin.role !== "admin") {
      throw new AppError("Only admins can approve organisation accounts", 403, "FORBIDDEN");
    }
    if (!PRIVILEGED_ORG_ROLES.includes(options.grantRole)) {
      throw new AppError(`Cannot grant role "${options.grantRole}" via this endpoint`, 422, "INVALID_ROLE");
    }

    await withTransaction(async (client) => {
      if (options.approved) {
        await client.query(
          `UPDATE users SET role = $2, is_verified_org = TRUE, org_verified_at = NOW(), org_verified_by_user_id = $3, updated_at = NOW() WHERE id = $1`,
          [targetUserId, options.grantRole, admin.id]
        );
        await notificationService.notifyUser(targetUserId, "system", "Organisation verified",
          `Your account has been verified as ${options.grantRole}. You now have full platform access.`, { role: options.grantRole });
      } else {
        await notificationService.notifyUser(targetUserId, "system", "Organisation verification not approved",
          options.rejectionReason ?? "Please contact support to resubmit your verification.", {});
      }

      await client.query(
        `INSERT INTO volunteer_activity_logs (user_id, activity_type, notes, points_delta) VALUES ($1, 'org_verification_decision', $2, 0)`,
        [admin.id, JSON.stringify({ targetUserId, ...options })]
      );
    });

    logger.info("Org verification decision made", { adminId: admin.id, targetUserId, approved: options.approved });
  }

  /** List pending requests — admin only */
  async listPendingRequests(): Promise<Array<{ userId: string; phone: string; fullName: string | null; requestedAt: Date; orgRegistrationNumber: string | null }>> {
    const result = await query<{ user_id: string; phone: string; full_name: string | null; created_at: Date; org_registration_number: string | null }>(
      `SELECT DISTINCT ON (u.id) u.id AS user_id, u.phone, u.full_name, val.created_at, u.org_registration_number
       FROM users u
       JOIN volunteer_activity_logs val ON val.user_id = u.id AND val.activity_type = 'org_verification_request'
       WHERE u.is_verified_org = FALSE AND u.org_registration_number IS NOT NULL
       ORDER BY u.id, val.created_at DESC`
    );
    return result.rows.map(r => ({ userId: r.user_id, phone: r.phone, fullName: r.full_name, requestedAt: r.created_at, orgRegistrationNumber: r.org_registration_number }));
  }

  /** Guard: throws if user is privileged role but not yet verified */
  async assertVerifiedOrg(userId: string, role: UserRole): Promise<void> {
    if (!PRIVILEGED_ORG_ROLES.includes(role)) return;
    const result = await query<{ is_verified_org: boolean }>(`SELECT is_verified_org FROM users WHERE id = $1`, [userId]);
    if (!result.rows[0]?.is_verified_org) {
      throw new AppError("Your organisation account has not been verified yet. Complete the verification process to use this feature.", 403, "ORG_NOT_VERIFIED");
    }
  }
}

export const ngoVerificationService = new NgoVerificationService();
