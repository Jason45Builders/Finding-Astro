/**
 * MockPaymentAdapter.ts
 *
 * Development-only payment adapter. Simulates Razorpay-like behaviour
 * with deterministic randomness for testing success/failure flows.
 */

import crypto from "node:crypto";
import { AppError } from "../../middleware/error.middleware";
import { BasePaymentAdapter, PaymentOrder, PaymentWebhookPayload, PaymentWebhookVerification } from "./PaymentAdapter";

interface MockOrderRecord {
  order: PaymentOrder;
  secret: string;
}

export class MockPaymentAdapter extends BasePaymentAdapter {
  readonly provider = "mock";
  private orders = new Map<string, MockOrderRecord>();

  async createOrder(amount: number, metadata: Record<string, unknown>): Promise<PaymentOrder> {
    const normalizedAmount = this.normalizeAmount(amount);
    const orderId = `mock_order_${crypto.randomUUID().replace(/-/g, "")}`;
    const secret = crypto.randomBytes(16).toString("hex");

    const order = this.buildOrder(orderId, normalizedAmount, "created", metadata);
    this.orders.set(orderId, { order, secret });

    console.log(`[MockPayment] Created order ${orderId} for INR ${normalizedAmount}`);
    return order;
  }

  async verifyWebhook(payload: PaymentWebhookPayload): Promise<PaymentWebhookVerification> {
    // In mock mode, verify the signature is exactly the secret for the order
    let orderId: string | null = null;
    let amount: number | null = null;
    let status: PaymentOrder["status"] | null = null;

    try {
      const data = JSON.parse(payload.rawBody) as Record<string, unknown>;
      orderId = (data.orderId as string) ?? null;
      amount = (data.amount as number) ?? null;
      status = (data.status as PaymentOrder["status"]) ?? null;
    } catch {
      // If body isn't JSON, treat as invalid
      return { valid: false, eventType: "unknown", orderId: null, amount: null, status: null };
    }

    const record = orderId ? this.orders.get(orderId) : undefined;
    if (!record) {
      console.warn(`[MockPayment] Webhook verification failed: order ${orderId} not found`);
      return { valid: false, eventType: "unknown", orderId, amount, status };
    }

    const valid = payload.signature === record.secret;
    console.log(`[MockPayment] Webhook ${valid ? "VALID" : "INVALID"} for order ${orderId}`);

    return {
      valid,
      eventType: valid ? "payment.captured" : "payment.failed",
      orderId,
      amount,
      status: valid ? "paid" : "failed",
    };
  }

  async getPaymentStatus(orderId: string): Promise<PaymentOrder> {
    const record = this.orders.get(orderId);
    if (!record) {
      throw new AppError("Order not found", 404, "PAYMENT_ORDER_NOT_FOUND");
    }

    // Simulate async payment completion — after 30 seconds, auto-resolve
    const ageMs = Date.now() - record.order.createdAt.getTime();
    if (ageMs > 30_000 && record.order.status === "created") {
      // Deterministic pseudo-random based on order id hash
      const hash = crypto.createHash("sha256").update(orderId).digest("hex");
      const success = parseInt(hash.slice(0, 8), 16) % 2 === 0;
      record.order.status = success ? "paid" : "failed";
      console.log(`[MockPayment] Order ${orderId} auto-resolved to ${record.order.status}`);
    }

    return { ...record.order };
  }

  /** Expose the secret so that test harnesses can build valid mock webhooks. */
  getSecretForOrder(orderId: string): string | undefined {
    return this.orders.get(orderId)?.secret;
  }

  /** Programmatically set the status of a mock order (useful in tests). */
  setStatus(orderId: string, status: PaymentOrder["status"]): void {
    const record = this.orders.get(orderId);
    if (record) {
      record.order.status = status;
    }
  }
}
