/**
 * auth.middleware.ts — GUARDRAILS APPLIED
 *
 * Changes from previous version:
 *   1. authenticate() now checks is_banned on every request — banned users
 *      get 403 immediately, even with a valid token
 *   2. requireTier() — new middleware that enforces identity tier requirements
 *      per action (replaces ad-hoc role checks for sensitive actions)
 *   3. optionalAuthenticate() unchanged — still used for emergency report path
 *   4. setUserContext() — sets PostgreSQL session variables so DB triggers
 *      can log the current user in audit tables
 */

import { NextFunction, Response } from "express";
import { AppError } from "./error.middleware";
import { verifyToken } from "../modules/auth/auth.service";
import { AuthenticatedRequest, UserRole } from "../types/global.types";
import { query } from "../config/db";

// Minimum identity tier required for each sensitive action
// Mirror of tier_permissions table — enforced here at middleware layer
export const TIER_REQUIREMENTS: Record<string, number> = {
  // These stay at tier 0 — emergency path must never have friction
  emergency_report: 0,
  view_animal_map:  0,
  view_feeding_spots: 0,
  report_sighting:  0,

  // Require a name (tier 1)
  claim_rescue_case:  1,
  add_animal_record:  1,
  mark_animal_seen:   1,
  view_case_details:  1,

  // Require Aadhaar (tier 2) — anything that can harm animals
  abuse_report:       2,
  conflict_report:    2,
  safety_report:      2,
  adopt_application:  2,
  request_abc:        2,
  view_animal_history: 2,

  // Require verified org (tier 3)
  verify_cases:       3,
  change_animal_status: 3,
  approve_abc:        3,
  issue_report_verdict: 3,
  mark_case_false:    3,

  // Require govt (tier 4)
  approve_removal:    4,

  // Admin only (tier 5)
  ban_user:           5,
  unban_user:         5,
};

// ── Standard authentication ──────────────────────────────────────────────────
export const authenticate = async (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = verifyToken(token);

    // Check ban status on every request — not just at login
    const banCheck = await query<{ is_banned: boolean; ban_reason: string | null; identity_tier: number }>(
      `SELECT is_banned, ban_reason, COALESCE(identity_tier, 0) AS identity_tier
       FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (!banCheck.rows[0]) {
      next(new AppError("Account not found", 401, "ACCOUNT_NOT_FOUND"));
      return;
    }

    if (banCheck.rows[0].is_banned) {
      next(new AppError(
        `This account has been suspended. Reason: ${banCheck.rows[0].ban_reason ?? "Violation of platform rules"}. Contact support if you believe this is an error.`,
        403, "ACCOUNT_BANNED"
      ));
      return;
    }

    // Attach full user context including identity tier
    request.user = {
      ...decoded,
      identityTier: banCheck.rows[0].identity_tier,
    };

    // Set PostgreSQL session variables so DB triggers can audit correctly
    await query(
      `SELECT set_config('app.current_user_id', $1, TRUE),
              set_config('app.current_user_role', $2, TRUE),
              set_config('app.current_user_tier', $3, TRUE)`,
      [decoded.id, decoded.role, banCheck.rows[0].identity_tier.toString()]
    ).catch(() => {}); // non-fatal

    next();
  } catch (error) {
    next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN", error));
  }
};

// ── Optional auth — for emergency report (tier 0 path) ───────────────────────
export const optionalAuthenticate = async (
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = verifyToken(token);
    const banCheck = await query<{ is_banned: boolean; identity_tier: number }>(
      `SELECT is_banned, COALESCE(identity_tier, 0) AS identity_tier FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );

    // Banned users cannot even use the guest path — they are fully blocked
    if (banCheck.rows[0]?.is_banned) {
      next(new AppError("This account has been suspended.", 403, "ACCOUNT_BANNED"));
      return;
    }

    if (banCheck.rows[0]) {
      request.user = { ...decoded, identityTier: banCheck.rows[0].identity_tier };
    }
  } catch {
    // Invalid token — treat as unauthenticated guest
  }
  next();
};

// ── Role enforcement ─────────────────────────────────────────────────────────
export const requireRoles = (...roles: UserRole[]) =>
  (_req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!_req.user) { next(new AppError("Authentication required", 401, "UNAUTHORIZED")); return; }
    if (!roles.includes(_req.user.role)) {
      next(new AppError("Insufficient permissions for this action", 403, "FORBIDDEN")); return;
    }
    next();
  };

// ── Identity tier enforcement ────────────────────────────────────────────────
// This is the key guardrail: requireTier(2) on abuse reports means
// only Aadhaar-verified users can file abuse complaints.
export const requireTier = (minimumTier: number, actionName?: string) =>
  (request: AuthenticatedRequest, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
      return;
    }

    const userTier = (request.user as { identityTier?: number }).identityTier ?? 0;

    if (userTier < minimumTier) {
      const tierNames = ["phone only", "registered name", "Aadhaar verified", "verified organisation", "government", "admin"];
      const required = tierNames[minimumTier] ?? `tier ${minimumTier}`;
      const current  = tierNames[userTier]    ?? `tier ${userTier}`;

      next(new AppError(
        `This action requires ${required} identity verification. Your current level is ${current}. ` +
        (minimumTier === 2
          ? "Please verify your identity with Aadhaar to continue."
          : "Please complete identity verification to access this feature."),
        403, "IDENTITY_TIER_REQUIRED"
      ));
      return;
    }

    next();
  };
