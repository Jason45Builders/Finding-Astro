import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { mapFundingCase } from "@/lib/types";

const DonateSchema = z.object({
  fundingCaseId: z.string().uuid(),
  amount: z.number().positive().min(1).max(1_000_000),
  idempotencyKey: z.string().optional(),
});

const ReimbursementRequestSchema = z.object({
  caseId: z.string().uuid(),
  amountClaimed: z.number().positive().max(10_000_000),
  billUrl: z.string().url(),
  prescriptionUrl: z.string().url(),
  doctorName: z.string().max(200).optional(),
  hospitalId: z.string().uuid().optional(),
});

const ReimbursementVerifySchema = z.object({
  reimbursementId: z.string().uuid(),
  verified: z.boolean(),
  notes: z.string().max(1000).optional(),
});

const RefundSchema = z.object({
  fundingTransactionId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/funding\/?/, "").split("/").filter(Boolean);

    // /funding/{id} — single funding case fetch. "reimbursement" has its own sub-namespace, not an id.
    if (pathParts.length === 1 && pathParts[0] !== "reimbursement") {
      const { data, error } = await supabaseAdmin().from("funding_cases").select("*").eq("id", pathParts[0]).single();
      if (error) return notFound("Funding case not found");
      return ok(mapFundingCase(data), "Funding case loaded");
    }

    // bare /funding — list
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    const status = url.searchParams.get("status");
    let query = supabaseAdmin().from("funding_cases").select("*");
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapFundingCase), "Funding cases loaded", { count: data?.length ?? 0 });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const ip = getClientIp(req);
    const rate = await checkRateLimit(ip);
    if (!rate.allowed) {
      return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/funding\/?/, "").split("/").filter(Boolean);

    if (pathParts[0] === "donate") return handleDonate(req, authResult.user);
    if (pathParts[0] === "reimbursement" && pathParts[1] === "request") return handleReimbursementRequest(req, authResult.user);
    if (pathParts[0] === "reimbursement" && pathParts[1] === "verify") return handleReimbursementVerify(req, authResult.user);
    if (pathParts[0] === "refund") return handleRefund(req, authResult.user);

    return new Response(null, { status: 405 });
  } catch {
    return serverError();
  }
}

async function handleDonate(req: NextRequest, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(DonateSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { fundingCaseId, amount, idempotencyKey } = parsed.data;

    if (idempotencyKey) {
      const { data: existingTx } = await supabaseAdmin().from("funding_transactions").select("id").eq("funding_case_id", fundingCaseId).eq("user_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (existingTx) return ok({ id: existingTx.id, message: "Donation already processed" }, "Donation already recorded");
    }

    const { data: existing, error: fetchError } = await supabaseAdmin().from("funding_cases").select("total_amount, amount_raised, status").eq("id", fundingCaseId).single();
    if (fetchError || !existing || existing.status !== "OPEN") return notFound("Funding case not found or closed");

    const { data: donorRow } = await supabaseAdmin().from("users").select("full_name, email").eq("id", user.id).single();
    const donorName = (donorRow as Record<string, unknown> | null)?.full_name ?? (donorRow as Record<string, unknown> | null)?.email ?? `User ${user.id.slice(0, 8)}`;

    const { data: tx, error } = await supabaseAdmin().from("funding_transactions").insert({
      funding_case_id: fundingCaseId,
      user_id: user.id,
      amount,
      payment_status: "PENDING",
      donor_name: donorName,
      is_anonymous: false,
      is_matched: false,
      idempotency_key: idempotencyKey ?? null,
    }).select("*").single();

    if (error) return serverError(error.message);

    const { data: txRows } = await supabaseAdmin().from("funding_transactions").select("amount").eq("funding_case_id", fundingCaseId).eq("payment_status", "SUCCESS");
    const totalRaised = (txRows ?? []).reduce((sum, t: { amount: number }) => sum + Number(t.amount), 0);

    await supabaseAdmin().from("funding_cases").update({ amount_raised: totalRaised, status: totalRaised >= Number(existing.total_amount) ? "CLOSED" : "OPEN" }).eq("id", fundingCaseId);

    if (tx) await audit({ tableName: "funding_transactions", recordId: tx.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: tx });
    return ok(tx, "Donation recorded");
  } catch {
    return serverError();
  }
}

async function handleReimbursementRequest(req: NextRequest, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(ReimbursementRequestSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { caseId, amountClaimed, billUrl, prescriptionUrl, doctorName, hospitalId } = parsed.data;

    const { data, error } = await supabaseAdmin().from("reimbursement_requests").insert({
      case_id: caseId, volunteer_id: user.id, amount_claimed: amountClaimed, bill_url: billUrl,
      prescription_url: prescriptionUrl, doctor_name: doctorName ?? "", hospital_id: hospitalId ?? null,
      status: "PENDING_VERIFICATION",
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "reimbursement_requests", recordId: data.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: data });
    return ok(data, "Reimbursement requested");
  } catch {
    return serverError();
  }
}

async function handleReimbursementVerify(req: NextRequest, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(ReimbursementVerifySchema, raw);
    if (!parsed.ok) return parsed.response;
    const { reimbursementId, verified, notes } = parsed.data;

    const { data: existing, error: fetchError } = await supabaseAdmin().from("reimbursement_requests").select("hospital_id, case_id").eq("id", reimbursementId).single();
    if (fetchError || !existing) return badRequest("NOT_FOUND", "Reimbursement request not found");

    if (user.role === "hospital" && existing.hospital_id) {
      const { data: hospitalLink } = await supabaseAdmin().from("partner_clinics").select("id").eq("id", existing.hospital_id).eq("is_verified", true).maybeSingle();
      if (!hospitalLink) {
        const { data: userRow } = await supabaseAdmin().from("users").select("id").eq("id", user.id).maybeSingle();
        if (!userRow) return badRequest("FORBIDDEN", "Hospital verification requires a verified hospital account");
      }
    }

    const status = verified ? "VERIFIED" : "REJECTED";
    const { data, error } = await supabaseAdmin().from("reimbursement_requests").update({ status, verified_at: new Date().toISOString(), hospital_notes: notes ?? null }).eq("id", reimbursementId).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "reimbursement_requests", recordId: reimbursementId, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: data });
    return ok(data, `Reimbursement ${status.toLowerCase()}`);
  } catch {
    return serverError();
  }
}

async function handleRefund(req: NextRequest, user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(RefundSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { fundingTransactionId, reason } = parsed.data;

    const { data: tx, error: txError } = await supabaseAdmin().from("funding_transactions").select("*").eq("id", fundingTransactionId).single();
    if (txError || !tx) return notFound("Transaction not found");
    if (tx.user_id !== user.id && !["admin", "govt"].includes(user.role)) return badRequest("FORBIDDEN", "You can only refund your own donations");
    if (tx.payment_status === "REFUNDED") return badRequest("INVALID_STATUS", "Transaction already refunded");
    if (tx.payment_status === "PENDING") return badRequest("INVALID_STATUS", "Cannot refund a pending donation");
    const createdAt = new Date((tx as Record<string, unknown>).created_at as string);
    const daysSinceDonation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDonation > 30) return badRequest("INVALID_STATUS", "Refunds are only allowed within 30 days of donation");
    if (tx.amount > 100_000 && user.role !== "admin") return badRequest("FORBIDDEN", "Refunds above ₹1,00,000 require admin approval");

    const { data: refund, error: refundError } = await supabaseAdmin().from("refunds").insert({
      funding_transaction_id: fundingTransactionId,
      funding_case_id: tx.funding_case_id,
      user_id: tx.user_id,
      amount: tx.amount,
      reason,
      status: "PENDING",
    }).select("*").single();

    if (refundError) return serverError(refundError.message);

    await supabaseAdmin().from("funding_transactions").update({ payment_status: "REFUNDED" }).eq("id", fundingTransactionId);

    await audit({ tableName: "refunds", recordId: refund.id, action: "INSERT", actorId: user.id, actorRole: user.role, newData: refund });
    return ok(refund, "Refund initiated");
  } catch {
    return serverError();
  }
}
