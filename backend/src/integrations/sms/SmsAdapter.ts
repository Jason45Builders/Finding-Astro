/**
 * SmsAdapter.ts
 *
 * Interface for SMS provider integrations.
 */

export interface SmsDeliveryResult {
  messageId: string | null;
  status: "sent" | "queued" | "failed";
  provider: string;
  timestamp: Date;
}

export interface SmsAdapter {
  /** Send an OTP code to the given phone number (E.164 format). */
  sendOtp(phone: string, code: string): Promise<SmsDeliveryResult>;

  /** Send a plain-text notification to the given phone number. */
  sendNotification(phone: string, message: string): Promise<SmsDeliveryResult>;
}

export abstract class BaseSmsAdapter implements SmsAdapter {
  abstract readonly provider: string;

  abstract sendOtp(phone: string, code: string): Promise<SmsDeliveryResult>;
  abstract sendNotification(phone: string, message: string): Promise<SmsDeliveryResult>;

  protected buildResult(messageId: string | null, status: SmsDeliveryResult["status"]): SmsDeliveryResult {
    return { messageId, status, provider: this.provider, timestamp: new Date() };
  }

  protected normalizePhone(phone: string): string {
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }
}
