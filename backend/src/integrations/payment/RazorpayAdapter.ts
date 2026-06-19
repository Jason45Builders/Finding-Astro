/**
 * RazorpayAdapter.ts
 *
 * Production adapter for Razorpay. Requires RAZORPAY_KEY_ID and RAZORPAY_SECRET.
 * This is a stub — implement the real HTTP calls when credentials are available.
 */

import { AppError } from "../../middleware/error.middleware";
import { BasePaymentAdapter, PaymentOrder, PaymentWebhookPayload, PaymentWebhookVerification } from "./PaymentAdapter";
import { env } from "../../config/env";

export class RazorpayAdapter extends BasePaymentAdapter {
  readonly provider = "razorpay";

  private get keyId(): string {
    const key = env.RAZORPAY_KEY_ID;
    if (!key) throw new AppError("Razorpay key ID not configured", 503, "RAZORPAY_NOT_CONFIGURED");
    return key;
  }

  private get secret(): string {
    const key = env.RAZORPAY_SECRET;
    if (!key) throw new AppError("Razorpay secret not configured", 503, "RAZORPAY_NOT_CONFIGURED");
    return key;
  }

  async createOrder(amount: number, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const normalizedAmount = this.normalizeAmount(amount);
    console.log(`[Razorpay] Creating order for INR ${normalizedAmount} (stub)`);

    // TODO: Replace with real Razorpay Orders API call
    // POST https://api.razorpay.com/v1/orders
    // Headers: Basic auth (keyId:secret)
    // Body: { amount, currency: "INR", receipt, notes: metadata }

    const mockOrderId = `razorpay_stub_${Date.now()}`;
    return this.buildOrder(mockOrderId, normalizedAmount, "created", metadata);
  }

  async verifyWebhook(payload: PaymentWebhookPayload): Promise<PaymentWebhookVerification> {
    // TODO: Verify Razorpay webhook signature using HMAC-SHA256
    // signature = HMAC-SHA256(webhook_secret, rawBody)
    // Razorpay sends the signature in the X-Razorpay-Signature header

    const valid = payload.signature === "TODO_VERIFY_SIGNATURE";
    return {
      valid,
      eventType: "payment.captured",
      orderId: null,
      amount: null,
      status: valid ? "paid" : null,
    };
  }

  async getPaymentStatus(orderId: string): Promise<PaymentOrder> {
    // TODO: GET https://api.razorpay.com/v1/orders/{orderId}
    console.log(`[Razorpay] Fetching status for ${orderId} (stub)`);
    return this.buildOrder(orderId, 0, "created", {});
  }
}
