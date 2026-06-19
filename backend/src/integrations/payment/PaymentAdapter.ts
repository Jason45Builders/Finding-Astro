/**
 * PaymentAdapter.ts
 *
 * Interface for payment provider integrations.
 * All implementations must handle provider-specific errors and normalize them
 * into AppError instances where appropriate.
 */

import { AppError } from "../../middleware/error.middleware";

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "cancelled";
  provider: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PaymentWebhookPayload {
  signature: string;
  rawBody: string;
  eventType: string;
  data: Record<string, unknown>;
}

export interface PaymentWebhookVerification {
  valid: boolean;
  eventType: string;
  orderId: string | null;
  amount: number | null;
  status: PaymentOrder["status"] | null;
}

export interface PaymentAdapter {
  /** Create a new payment order for the given amount (in rupees/paise). */
  createOrder(amount: number, metadata: Record<string, unknown>): Promise<PaymentOrder>;

  /** Verify the signature and payload of a provider webhook. */
  verifyWebhook(payload: PaymentWebhookPayload): Promise<PaymentWebhookVerification>;

  /** Query the current status of an existing order. */
  getPaymentStatus(orderId: string): Promise<PaymentOrder>;
}

export abstract class BasePaymentAdapter implements PaymentAdapter {
  abstract readonly provider: string;

  abstract createOrder(amount: number, metadata: Record<string, unknown>): Promise<PaymentOrder>;
  abstract verifyWebhook(payload: PaymentWebhookPayload): Promise<PaymentWebhookVerification>;
  abstract getPaymentStatus(orderId: string): Promise<PaymentOrder>;

  protected normalizeAmount(amount: number): number {
    // Amount must be in paise (smallest currency unit)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError("Invalid payment amount", 400, "INVALID_PAYMENT_AMOUNT");
    }
    return Math.round(amount);
  }

  protected buildOrder(
    id: string,
    amount: number,
    status: PaymentOrder["status"],
    metadata: Record<string, unknown>
  ): PaymentOrder {
    return {
      id,
      amount: this.normalizeAmount(amount),
      currency: "INR",
      status,
      provider: this.provider,
      metadata,
      createdAt: new Date(),
    };
  }
}
