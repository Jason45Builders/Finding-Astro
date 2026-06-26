import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Handle /api/v1/funding/:id — single funding case lookup
  const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
  if (pathParts[1] === "funding" && pathParts.length > 2 && pathParts[2] !== "" && !url.searchParams.has("limit")) {
    const id = pathParts[2];
    if (id && id.length === 36) {
      const authResult = await authMiddleware(req);
      if ("error" in authResult) return authResult.error;
      const { data, error } = await supabaseAdmin.from("funding_cases").select("*").eq("id", id).maybeSingle();
      if (error) return serverError(error.message);
      if (!data) return notFound("Funding case not found");
      return ok(data, "Funding case loaded");
    }
  }

  // List funding cases
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const status = url.searchParams.get("status");

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    let query = supabaseAdmin.from("funding_cases").select("*");
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

async function handleDonate(req: NextRequest, user: { id: string }) {
  try {
    const { fundingCaseId, amount } = await req.json() as { fundingCaseId: string; amount: number };
    if (!fundingCaseId || !amount || amount <= 0) return badRequest("VALIDATION_ERROR", "Valid fundingCaseId and positive amount required");

    const { data: existing } = await supabaseAdmin.from("funding_cases").select("total_amount, amount_raised, status").eq("id", fundingCaseId).single();
    if (!existing || existing.status !== "OPEN") return notFound("Funding case not found or closed");

    const newRaised = Number(existing.amount_raised) + amount;
    const { data: tx, error } = await supabaseAdmin.from("funding_transactions").insert({
      funding_case_id: fundingCaseId,
      user_id: user.id,
      amount,
      payment_status: "SUCCESS",
      donor_name: `User ${user.id.slice(0, 8)}`,
      is_anonymous: false,
      is_matched: false,
    }).select("*").single();

    if (error) return serverError(error.message);

    await supabaseAdmin.from("funding_cases").update({ amount_raised: newRaised, status: newRaised >= Number(existing.total_amount) ? "CLOSED" : "OPEN" }).eq("id", fundingCaseId);

    return ok(tx, "Donation recorded");
  } catch {
    return serverError();
  }
}

async function handleReimbursementRequest(req: NextRequest, user: { id: string }) {
  try {
    const { caseId, amountClaimed, billUrl, prescriptionUrl, doctorName, hospitalId } = await req.json() as Record<string, unknown>;
    if (!caseId || !amountClaimed || !billUrl || !prescriptionUrl) return badRequest("VALIDATION_ERROR", "caseId, amountClaimed, billUrl and prescriptionUrl required");

    const { data, error } = await supabaseAdmin.from("reimbursement_requests").insert({
      case_id: caseId, volunteer_id: user.id, amount_claimed: amountClaimed, bill_url: billUrl,
      prescription_url: prescriptionUrl, doctor_name: doctorName ?? "", hospital_id: hospitalId ?? null,
      status: "PENDING_VERIFICATION",
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(data, "Reimbursement requested");
  } catch {
    return serverError();
  }
}

async function handleReimbursementVerify(req: NextRequest, _user: { id: string }) {
  try {
    const body = await req.json();
    const { reimbursementId, verified, notes } = body as { reimbursementId: string; verified: boolean; notes?: string };
    if (!reimbursementId) return badRequest("VALIDATION_ERROR", "reimbursementId required");

    const status = verified ? "VERIFIED" : "REJECTED";
    const { data, error } = await supabaseAdmin.from("reimbursement_requests").update({ status, verified_at: new Date().toISOString(), hospital_notes: notes ?? null }).eq("id", reimbursementId).select("*").single();
    if (error) return serverError(error.message);
    return ok(data, `Reimbursement ${status.toLowerCase()}`);
  } catch {
    return serverError();
  }
}

