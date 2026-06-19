/**
 * MockAadhaarAdapter.ts
 *
 * Development-only Aadhaar adapter. Simulates a successful verification
 * with the fake name "Rahul Kumar" for any valid 12-digit Aadhaar number.
 */

import crypto from "node:crypto";
import { AppError } from "../../middleware/error.middleware";
import { BaseAadhaarAdapter, AadhaarVerificationInitiated, AadhaarVerificationResult } from "./AadhaarAdapter";

interface MockSession {
  aadhaarNumber: string;
  createdAt: Date;
  attempts: number;
}

export class MockAadhaarAdapter extends BaseAadhaarAdapter {
  readonly provider = "mock";
  private sessions = new Map<string, MockSession>();

  async initiateVerification(aadhaarNumber: string): Promise<AadhaarVerificationInitiated> {
    if (!this.validateFormat(aadhaarNumber)) {
      throw new AppError(
        "Invalid Aadhaar number format. Aadhaar must be 12 digits and cannot start with 0 or 1.",
        422,
        "INVALID_AADHAAR_FORMAT"
      );
    }

    const requestId = crypto.randomUUID();
    this.sessions.set(requestId, {
      aadhaarNumber: this.normalizeAadhaar(aadhaarNumber),
      createdAt: new Date(),
      attempts: 0,
    });

    console.log(`[MockAadhaar] Initiated verification for ${this.maskAadhaar(aadhaarNumber)} — requestId: ${requestId}`);

    return { requestId, expiresInSeconds: 600 };
  }

  async verifyOtp(requestId: string, otp: string): Promise<AadhaarVerificationResult> {
    const session = this.sessions.get(requestId);
    if (!session) {
      throw new AppError("Verification session not found or expired. Please restart.", 404, "SESSION_NOT_FOUND");
    }

    const ageMs = Date.now() - session.createdAt.getTime();
    if (ageMs > 600_000) {
      this.sessions.delete(requestId);
      throw new AppError("OTP has expired. Please request a new one.", 401, "OTP_EXPIRED");
    }

    if (session.attempts >= 3) {
      throw new AppError("Too many incorrect OTP attempts. Please restart verification.", 429, "OTP_LOCKED");
    }

    // Accept any 6-digit OTP in mock mode
    const isValid = /^\d{6}$/.test(otp);
    if (!isValid) {
      session.attempts += 1;
      const remaining = 3 - session.attempts;
      throw new AppError(`Invalid OTP. ${remaining} attempt(s) remaining.`, 401, "INVALID_OTP");
    }

    this.sessions.delete(requestId);
    console.log(`[MockAadhaar] Verified ${this.maskAadhaar(session.aadhaarNumber)} — name: Rahul Kumar`);

    return { verified: true, name: "Rahul Kumar", tier: 2, provider: this.provider };
  }

  private maskAadhaar(aadhaarNumber: string): string {
    const clean = this.normalizeAadhaar(aadhaarNumber);
    return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
  }
}
