import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const DonateSchema = z.object({
  fundingCaseId: z.string().uuid(),
  amount: z.number().positive(),
});

const ReimbursementRequestSchema = z.object({
  caseId: z.string().uuid(),
  amountClaimed: z.number().positive(),
  billUrl: z.string().url(),
  prescriptionUrl: z.string().url(),
  doctorName: z.string().optional(),
  hospitalId: z.string().uuid().optional(),
});

const ReimbursementVerifySchema = z.object({
  reimbursementId: z.string().uuid(),
  verified: z.boolean(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const status = url.searchParams.get("status");

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    let query = supabaseAdmin().from("funding_cases").select("*");
    if (status) query = query.eq("status", status);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Funding cases loaded", { count: data?.length ?? 0 });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");

    if (pathParts[1] === "funding" && pathParts[2] === "donate") return handleDonate(req, authResult.user);
    if (pathParts[1] === "funding" && pathParts[2] === "reimbursement" && pathParts[3] === "request") return handleReimbursementRequest(req, authResult.user);
    if (pathParts[1] === "funding" && pathParts[2] === "reimbursement" && pathParts[3] === "verify") return handleReimbursementVerify(req, authResult.user);

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
    const { fundingCaseId, amount } = parsed.data;

    const { data: existing } = await supabaseAdmin().from("funding_cases").select("total_amount, amount_raised, status").eq("id", fundingCaseId).single();
    if (!existing || existing.status !== "OPEN") return notFound("Funding case not found or closed");

    const newRaised = Number(existing.amount_raised) + amount;
    const { data: tx, error } = await supabaseAdmin().from("funding_transactions").insert({
      funding_case_id: fundingCaseId,
      user_id: user.id,
      amount,
      payment_status: "SUCCESS",
      donor_name: `User ${user.id.slice(0, 8)}`,
      is_anonymous: false,
      is_matched: false,
    }).select("*").single();

    if (error) return serverError(error.message);

    await supabaseAdmin().from("funding_cases").update({ amount_raised: newRaised, status: newRaised >= Number(existing.total_amount) ? "CLOSED" : "OPEN" }).eq("id", fundingCaseId);

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

async function handleReimbursementVerify(req: NextRequest, _user: { id: string; role: string }) {
  try {
    const raw = await req.json();
    const parsed = validateBody(ReimbursementVerifySchema, raw);
    if (!parsed.ok) return parsed.response;
    const { reimbursementId, verified, notes } = parsed.data;

    const status = verified ? "VERIFIED" : "REJECTED";
    const { data, error } = await supabaseAdmin().from("reimbursement_requests").update({ status, verified_at: new Date().toISOString(), hospital_notes: notes ?? null }).eq("id", reimbursementId).select("*").single();
    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "reimbursement_requests", recordId: reimbursementId, action: "UPDATE", actorId: _user.id, actorRole: _user.role, newData: data });
    return ok(data, `Reimbursement ${status.toLowerCase()}`);
  } catch {
    return serverError();
  }
}

