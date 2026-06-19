/**
 * AadhaarAdapter.ts
 *
 * Interface for Aadhaar / identity verification provider integrations.
 */

export interface AadhaarVerificationInitiated {
  requestId: string;
  expiresInSeconds: number;
}

export interface AadhaarVerificationResult {
  verified: boolean;
  name: string | null;
  tier: number;
  provider: string;
}

export interface AadhaarAdapter {
  /** Start an OTP verification flow for the given Aadhaar number. */
  initiateVerification(aadhaarNumber: string): Promise<AadhaarVerificationInitiated>;

  /** Verify the OTP and complete the Aadhaar linking. */
  verifyOtp(requestId: string, otp: string): Promise<AadhaarVerificationResult>;
}

export abstract class BaseAadhaarAdapter implements AadhaarAdapter {
  abstract readonly provider: string;

  abstract initiateVerification(aadhaarNumber: string): Promise<AadhaarVerificationInitiated>;
  abstract verifyOtp(requestId: string, otp: string): Promise<AadhaarVerificationResult>;

  protected normalizeAadhaar(aadhaarNumber: string): string {
    return aadhaarNumber.replace(/\s+/g, "").trim();
  }

  protected validateFormat(aadhaarNumber: string): boolean {
    const clean = this.normalizeAadhaar(aadhaarNumber);
    return /^[2-9]\d{11}$/.test(clean);
  }
}
