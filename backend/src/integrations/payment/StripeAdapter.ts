/**
 * StripeAdapter.ts
 *
 * Production adapter for Stripe. Requires STRIPE_SECRET_KEY.
 * This is a stub — implement the real HTTP calls when credentials are available.
 */

import { AppError } from "../../middleware/error.middleware";
import { BasePaymentAdapter, PaymentOrder, PaymentWebhookPayload, PaymentWebhookVerification } from "./PaymentAdapter";
import { env } from "../../config/env";

export class StripeAdapter extends BasePaymentAdapter {
  readonly provider = "stripe";

  private get secretKey(): string {
    const key = env.STRIPE_SECRET_KEY;
    if (!key) throw new AppError("Stripe secret key not configured", 503, "STRIPE_NOT_CONFIGURED");
    return key;
  }

  private get baseUrl(): string {
    return "https://api.stripe.com/v1";
  }

  async createOrder(amount: number, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const normalizedAmount = this.normalizeAmount(amount); // Stripe uses smallest currency unit (paise)
    console.log(`[Stripe] Creating PaymentIntent for INR ${normalizedAmount} (stub)`);

    // TODO: Replace with real Stripe PaymentIntents API call
    // POST https://api.stripe.com/v1/payment_intents
    // Headers: Authorization: Bearer sk_...
    // Body: amount, currency: "inr", metadata, receipt_email, etc.

    const mockId = `stripe_stub_${Date.now()}`;
    return this.buildOrder(mockId, normalizedAmount, "created", metadata);
  }

  async verifyWebhook(payload: PaymentWebhookPayload): Promise<PaymentWebhookVerification> {
    // TODO: Verify Stripe webhook signature using stripe-node library
    // stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)

    const valid = payload.signature === "TODO_VERIFY_SIGNATURE";
    return {
      valid,
      eventType: "payment_intent.succeeded",
      orderId: null,
      amount: null,
      status: valid ? "paid" : null,
    };
  }

  async getPaymentStatus(orderId: string): Promise<PaymentOrder> {
    // TODO: GET https://api.stripe.com/v1/payment_intents/{orderId}
    console.log(`[Stripe] Fetching status for ${orderId} (stub)`);
    return this.buildOrder(orderId, 0, "created", {});
  }
}
