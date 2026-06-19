/**
 * ExotelAdapter.ts
 *
 * Production adapter for Exotel SMS. Requires EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SID.
 * This is a stub — implement the real HTTP calls when credentials are available.
 */

import { AppError } from "../../middleware/error.middleware";
import { BaseSmsAdapter, SmsDeliveryResult } from "./SmsAdapter";
import { env } from "../../config/env";

export class ExotelAdapter extends BaseSmsAdapter {
  readonly provider = "exotel";

  private get apiKey(): string {
    const key = env.EXOTEL_API_KEY;
    if (!key) throw new AppError("Exotel API key not configured", 503, "EXOTEL_NOT_CONFIGURED");
    return key;
  }

  private get apiToken(): string {
    const token = env.EXOTEL_API_TOKEN;
    if (!token) throw new AppError("Exotel API token not configured", 503, "EXOTEL_NOT_CONFIGURED");
    return token;
  }

  private get sid(): string {
    const sid = env.EXOTEL_SID;
    if (!sid) throw new AppError("Exotel SID not configured", 503, "EXOTEL_NOT_CONFIGURED");
    return sid;
  }

  async sendOtp(phone: string, code: string): Promise<SmsDeliveryResult> {
    const normalizedPhone = this.normalizePhone(phone);
    console.log(`[Exotel] Sending OTP to ${normalizedPhone} (stub)`);

    // TODO: POST https://{sid}:{apiToken}@api.exotel.com/v1/Accounts/{sid}/Sms/send
    // Body: From, To, Body (template with OTP code)
    return this.buildResult(`exotel_stub_${Date.now()}`, "queued");
  }

  async sendNotification(phone: string, message: string): Promise<SmsDeliveryResult> {
    const normalizedPhone = this.normalizePhone(phone);
    console.log(`[Exotel] Sending notification to ${normalizedPhone} (stub)`);

    // TODO: Same endpoint as OTP but with custom message body
    return this.buildResult(`exotel_stub_${Date.now()}`, "queued");
  }
}
