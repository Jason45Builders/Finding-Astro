/**
 * identity-verification.service.ts
 *
 * Handles the Aadhaar verification flow.
 *
 * IMPORTANT DESIGN DECISIONS:
 *
 * 1. Aadhaar number is NEVER stored. Only SHA-256 hash.
 *    Even if the database is compromised, no Aadhaar numbers are exposed.
 *
 * 2. Verification is done via UIDAI's official OTP API (Aadhaar OTP Auth)
 *    or DigiLocker OAuth. Both are government-approved methods.
 *
 * 3. One Aadhaar = one account. The hash uniqueness index prevents the same
 *    person from creating multiple accounts to escape a ban.
 *
 * 4. Name from Aadhaar is stored for accountability — this is the name
 *    that appears on reports, not the self-declared name.
 *
 * 5. Aadhaar verification is NOT required for emergency reports.
 *    It IS required for: abuse reports, conflict reports, safety reports,
 *    ABC requests, adoption applications.
 *
 * 6. Voluntary for: rescue claims, sightings, animal records.
 *    But verified users get higher credibility scores and their reports
 *    are broadcast without delay.
 */

import crypto from "node:crypto";
import { query } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import { getAadhaarAdapter } from "../../integrations";

const hashAadhaar = (aadhaarNumber: string): string => {
  // Remove spaces, hash with SHA-256 + application salt
  const clean = aadhaarNumber.replace(/\s+/g, "").trim();
  return crypto
    .createHmac("sha256", env.AADHAAR_HASH_SALT)
    .update(clean)
    .digest("hex");
};

class IdentityVerificationService {

  // ── Step 1: Initiate Aadhaar OTP via UIDAI ────────────────────────────────
  async initiateAadhaarOtp(
    userId: string,
    aadhaarNumber: string
  ): Promise<{ requestId: string; expiresInSeconds: number }> {

    // Validate Aadhaar format (12 digits, not starting with 0 or 1)
    const clean = aadhaarNumber.replace(/\s+/g, "");
    if (!/^[2-9]\d{11}$/.test(clean)) {
      throw new AppError(
        "Invalid Aadhaar number format. Aadhaar must be 12 digits and cannot start with 0 or 1.",
        422, "INVALID_AADHAAR_FORMAT"
      );
    }

    const hash = hashAadhaar(clean);

    // Check if this Aadhaar is already linked to a DIFFERENT account
    const existing = await query<{ user_id: string }>(
      `SELECT user_id FROM aadhaar_verification_log WHERE aadhaar_hash = $1 LIMIT 1`,
      [hash]
    );

    if (existing.rows[0] && existing.rows[0].user_id !== userId) {
      throw new AppError(
        "This Aadhaar number is already linked to another account. Each Aadhaar can only be used once.",
        409, "AADHAAR_ALREADY_LINKED"
      );
    }

    // In production: call UIDAI OTP API or DigiLocker via adapter
    const adapter = getAadhaarAdapter();
    const adapterResult = await adapter.initiateVerification(clean);
    const requestId = adapterResult.requestId;

    // Store pending verification (expires in 10 minutes)
    await query(
      `INSERT INTO pending_aadhaar_verifications (user_id, aadhaar_hash, request_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (user_id) DO UPDATE
         SET aadhaar_hash = EXCLUDED.aadhaar_hash,
             request_id   = EXCLUDED.request_id,
             expires_at   = EXCLUDED.expires_at,
             updated_at   = NOW()`,
      [userId, hash, requestId]
    );

    const provider = (adapter as unknown as { provider?: string }).provider ?? env.AADHAAR_PROVIDER;
    logger.info("Aadhaar OTP initiated", { userId, requestId, provider });

    return { requestId, expiresInSeconds: adapterResult.expiresInSeconds };
  }

  // ── Step 2: Verify OTP and complete Aadhaar linking ───────────────────────
  async completeAadhaarVerification(
    userId: string,
    requestId: string,
    otp: string,
    ipAddress: string
  ): Promise<{ verified: boolean; tier: number; name: string }> {

    // Get pending verification
    const pending = await query<{
      aadhaar_hash: string; expires_at: Date; attempts: number
    }>(
      `SELECT aadhaar_hash, expires_at, COALESCE(attempts, 0) AS attempts
       FROM pending_aadhaar_verifications
       WHERE user_id = $1 AND request_id = $2 LIMIT 1`,
      [userId, requestId]
    );

    if (!pending.rows[0]) {
      throw new AppError("Verification session not found or expired. Please restart.", 404, "SESSION_NOT_FOUND");
    }

    if (pending.rows[0].expires_at.getTime() < Date.now()) {
      throw new AppError("OTP has expired. Please request a new one.", 401, "OTP_EXPIRED");
    }

    if (pending.rows[0].attempts >= 3) {
      throw new AppError("Too many incorrect OTP attempts. Please restart verification.", 429, "OTP_LOCKED");
    }

    // In production: call UIDAI OTP verify API or DigiLocker via adapter
    const adapter = getAadhaarAdapter();
    const adapterResult = await adapter.verifyOtp(requestId, otp);
    const uidaiVerified = adapterResult.verified;
    const aadhaarName = adapterResult.name ?? "Verified Citizen";

    if (!uidaiVerified) {
      await query(
        `UPDATE pending_aadhaar_verifications SET attempts = attempts + 1 WHERE user_id = $1`,
        [userId]
      );
      throw new AppError("Invalid OTP. Please check the SMS sent to your Aadhaar-linked mobile.", 401, "INVALID_OTP");
    }

    const hash = pending.rows[0].aadhaar_hash;

    // Double-check uniqueness (race condition guard)
    const duplicateCheck = await query<{ user_id: string }>(
      `SELECT user_id FROM aadhaar_verification_log WHERE aadhaar_hash = $1 LIMIT 1`,
      [hash]
    );
    if (duplicateCheck.rows[0] && duplicateCheck.rows[0].user_id !== userId) {
      throw new AppError(
        "This Aadhaar is linked to another account. Contact support if this is an error.",
        409, "AADHAAR_ALREADY_LINKED"
      );
    }

    // Record verification (hash only — no raw Aadhaar ever stored)
    await query(
      `INSERT INTO aadhaar_verification_log (user_id, aadhaar_hash, verification_type, verified_name, ip_address)
       VALUES ($1, $2, 'uidai_otp', $3, $4)
       ON CONFLICT (aadhaar_hash) DO UPDATE SET verified_name = EXCLUDED.verified_name, ip_address = EXCLUDED.ip_address`,
      [userId, hash, aadhaarName, ipAddress]
    );

    // Upgrade user to tier 2 and mark Aadhaar verified
    await query(
      `UPDATE users SET
         identity_tier       = GREATEST(identity_tier, 2),
         aadhaar_verified    = TRUE,
         aadhaar_hash        = $2,
         aadhaar_verified_at = NOW(),
         aadhaar_name        = $3,
         report_credibility_score = LEAST(report_credibility_score + 20, 100),
         updated_at          = NOW()
       WHERE id = $1`,
      [userId, hash, aadhaarName]
    );

    // Clean up pending verification
    await query(`DELETE FROM pending_aadhaar_verifications WHERE user_id = $1`, [userId]);

    logger.info("Aadhaar verification completed", { userId, name: aadhaarName });

    return { verified: true, tier: 2, name: aadhaarName };
  }

  // ── Promote to tier 1 (just providing a name) ─────────────────────────────
  async registerName(userId: string, fullName: string): Promise<{ tier: number }> {
    const trimmed = fullName.trim();
    if (trimmed.length < 3 || trimmed.length > 200) {
      throw new AppError("Full name must be between 3 and 200 characters.", 422, "INVALID_NAME");
    }

    await query(
      `UPDATE users SET
         full_name      = $2,
         identity_tier  = GREATEST(identity_tier, 1),
         updated_at     = NOW()
       WHERE id = $1`,
      [userId, trimmed]
    );

    return { tier: 1 };
  }

  // ── Check a user's current identity tier ──────────────────────────────────
  async getIdentityStatus(userId: string): Promise<{
    tier: number;
    tierName: string;
    aadhaarVerified: boolean;
    credibilityScore: number;
    canDo: string[];
    cannotDo: string[];
  }> {
    const result = await query<{
      identity_tier: number;
      aadhaar_verified: boolean;
      report_credibility_score: number;
    }>(
      `SELECT identity_tier, aadhaar_verified, report_credibility_score FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

    const tier = user.identity_tier;
    const tierNames = ["Phone verified", "Name registered", "Aadhaar verified", "Verified organisation", "Government officer", "Administrator"];
    const tierName = tierNames[tier] ?? "Unknown";

    const canDo: string[] = [];
    const cannotDo: string[] = [];

    if (tier >= 0) canDo.push("Emergency animal rescue reports", "View animal map");
    if (tier >= 1) canDo.push("Claim rescue cases", "Add animal records", "Mark animals seen");
    else cannotDo.push("Claim rescue cases (register your name first)");

    if (tier >= 2) canDo.push("File abuse complaints", "File conflict reports", "Apply to adopt", "Request ABC");
    else cannotDo.push("File abuse complaints — Aadhaar required", "Adoption applications — Aadhaar required");

    if (tier >= 3) canDo.push("Verify cases as NGO", "Issue report verdicts", "Change animal status");

    return {
      tier,
      tierName,
      aadhaarVerified: user.aadhaar_verified,
      credibilityScore: Number(user.report_credibility_score),
      canDo,
      cannotDo,
    };
  }
}

export const identityVerificationService = new IdentityVerificationService();
