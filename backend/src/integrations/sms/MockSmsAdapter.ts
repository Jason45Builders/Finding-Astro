/**
 * MockSmsAdapter.ts
 *
 * Development-only SMS adapter. Prints messages to the console.
 * Never sends real SMS.
 */

import { BaseSmsAdapter, SmsDeliveryResult } from "./SmsAdapter";

export class MockSmsAdapter extends BaseSmsAdapter {
  readonly provider = "mock";

  async sendOtp(phone: string, code: string): Promise<SmsDeliveryResult> {
    const normalizedPhone = this.normalizePhone(phone);
    console.log(`[MockSMS] OTP to ${normalizedPhone}: ${code}`);
    return this.buildResult(`mock_otp_${Date.now()}`, "sent");
  }

  async sendNotification(phone: string, message: string): Promise<SmsDeliveryResult> {
    const normalizedPhone = this.normalizePhone(phone);
    console.log(`[MockSMS] Notification to ${normalizedPhone}: ${message}`);
    return this.buildResult(`mock_msg_${Date.now()}`, "sent");
  }
}
