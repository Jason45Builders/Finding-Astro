/**
 * DigilockerAdapter.ts
 *
 * Production adapter for DigiLocker Aadhaar verification. Requires Digilocker credentials.
 * This is a stub — implement the real OAuth + eKYC flow when credentials are available.
 */

import crypto from "node:crypto";
import { AppError } from "../../middleware/error.middleware";
import { BaseAadhaarAdapter, AadhaarVerificationInitiated, AadhaarVerificationResult } from "./AadhaarAdapter";

export class DigilockerAdapter extends BaseAadhaarAdapter {
  readonly provider = "digilocker";

  async initiateVerification(aadhaarNumber: string): Promise<AadhaarVerificationInitiated> {
    if (!this.validateFormat(aadhaarNumber)) {
      throw new AppError(
        "Invalid Aadhaar number format. Aadhaar must be 12 digits and cannot start with 0 or 1.",
        422,
        "INVALID_AADHAAR_FORMAT"
      );
    }

    // TODO: Initiate DigiLocker OAuth 2.0 flow
    // 1. Redirect user to DigiLocker consent screen
    // 2. Request "aadhaar_details" scope
    // 3. Store state + nonce for callback verification

    const requestId = crypto.randomUUID();
    console.log(`[DigiLocker] Initiated eKYC flow for ${this.maskAadhaar(aadhaarNumber)} (stub)`);

    return { requestId, expiresInSeconds: 600 };
  }

  async verifyOtp(requestId: string, otp: string): Promise<AadhaarVerificationResult> {
    // TODO: Exchange DigiLocker auth code for token, then fetch issued documents
    // The "otp" parameter here is the DigiLocker auth code received after user consent
    console.log(`[DigiLocker] Completing eKYC for request ${requestId} (stub)`);

    if (!otp || otp.length < 6) {
      throw new AppError("Invalid DigiLocker authorization code", 401, "INVALID_OTP");
    }

    return { verified: true, name: "DigiLocker Verified User", tier: 2, provider: this.provider };
  }

  private maskAadhaar(aadhaarNumber: string): string {
    const clean = this.normalizeAadhaar(aadhaarNumber);
    return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
  }
}
