/**
 * Fast2SmsAdapter.ts
 *
 * Production adapter for Fast2SMS. Requires FAST2SMS_API_KEY.
 * This is a stub — implement the real HTTP calls when credentials are available.
 */

import { AppError } from "../../middleware/error.middleware";
import { BaseSmsAdapter, SmsDeliveryResult } from "./SmsAdapter";
import { env } from "../../config/env";

export class Fast2SmsAdapter extends BaseSmsAdapter {
  readonly provider = "fast2sms";

  private get apiKey(): string {
    const key = env.FAST2SMS_API_KEY;
    if (!key) throw new AppError("Fast2SMS API key not configured", 503, "FAST2SMS_NOT_CONFIGURED");
    return key;
  }

  async sendOtp(phone: string, code: string): Promise<SmsDeliveryResult> {
    const normalizedPhone = this.normalizePhone(phone);
    console.log(`[Fast2SMS] Sending OTP to ${normalizedPhone} (stub)`);

    // TODO: POST https://www.fast2sms.com/dev/bulkV2
    // Headers: authorization: {apiKey}
    // Body: route, numbers, variables, message template
    return this.buildResult(`fast2sms_stub_${Date.now()}`, "queued");
  }

  async sendNotification(phone: string, message: string): Promise<SmsDeliveryResult> {
    const normalizedPhone = this.normalizePhone(phone);
    console.log(`[Fast2SMS] Sending notification to ${normalizedPhone} (stub)`);

    // TODO: Same endpoint with a different route/template for transactional messages
    return this.buildResult(`fast2sms_stub_${Date.now()}`, "queued");
  }
}
