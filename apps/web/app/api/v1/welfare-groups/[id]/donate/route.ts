import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, badRequest } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateReceiptNumber, isValidUpiId } from "@/lib/welfare-payment-utils";

const DonateSchema = z.object({
  amount: z.number().positive().min(1).max(1_000_000),
  utr: z.string().min(1).max(50),
  paymentDate: z.string().min(1),
  purpose: z.string().optional(),
  note: z.string().optional(),
  caseId: z.string().uuid().optional(),
  animalId: z.string().uuid().optional(),
  proofUrl: z.string().url().optional(),
}).refine((data) => {
  const utr = data.utr.replace(/\s/g, "");
  if (utr.length < 6 || utr.length > 35) return false;
  if (!/^[A-Za-z0-9]+$/.test(utr)) return false;
  return true;
}, { message: "Invalid UTR format. UPI transaction references are 6-35 alphanumeric characters." });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = validateBody(DonateSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { amount, utr, paymentDate, purpose, note, caseId, animalId, proofUrl } = parsed.data;

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const rateLimit = await checkRateLimit(`welfare-donate:${authResult.user.id}:${ip}:${userAgent}`);
    if (!rateLimit.allowed) {
      return badRequest("RATE_LIMIT_EXCEEDED", `Too many donation attempts. Please wait ${rateLimit.retryAfter} seconds.`);
    }

    const { data: org, error: orgError } = await supabaseAdmin()
      .from("welfare_orgs")
      .select("id, name, upi_id, upi_name, payment_enabled, is_active")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !org) return notFound("Welfare group not found");
    if (!org.payment_enabled) return badRequest("PAYMENTS_DISABLED", "This welfare group is not accepting donations at this time");

    if (!org.upi_id || !isValidUpiId(org.upi_id)) {
      return badRequest("INVALID_UPI", "This welfare group has not configured a valid UPI ID");
    }

    const { data: existingUtr } = await supabaseAdmin()
      .from("welfare_payments")
      .select("id")
      .eq("welfare_group_id", id)
      .eq("utr", utr)
      .maybeSingle();

    if (existingUtr) {
      return badRequest("DUPLICATE_UTR", "This transaction reference has already been submitted for this welfare group.");
    }

    const paymentTimestamp = new Date(paymentDate).getTime();
    const now = Date.now();
    if (isNaN(paymentTimestamp) || paymentTimestamp > now) {
      return badRequest("INVALID_DATE", "Payment date cannot be in the future");
    }
    if (now - paymentTimestamp > 30 * 24 * 60 * 60 * 1000) {
      return badRequest("INVALID_DATE", "Payment date must be within the last 30 days");
    }
    if (amount >= 10_000 && !proofUrl) {
      return badRequest("PROOF_REQUIRED", "Proof of payment is required for donations of ₹10,000 or more");
    }

    const receiptNumber = generateReceiptNumber();

    const { data: payment, error } = await supabaseAdmin()
      .from("welfare_payments")
      .insert({
        welfare_group_id: id,
        donor_id: authResult.user.id,
        case_id: caseId || null,
        animal_id: animalId || null,
        amount,
        currency: "INR",
        upi_id_snapshot: org.upi_id,
        upi_name_snapshot: org.upi_name || "",
        utr,
        payment_date: paymentDate,
        purpose: purpose || null,
        note: note || null,
        proof_url: proofUrl || null,
        status: "PENDING",
        receipt_number: receiptNumber,
        donor_name: null,
        donor_email: null,
        is_anonymous: false,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);

    await supabaseAdmin().from("welfare_payment_events").insert({
      welfare_payment_id: payment.id,
      event_type: "submitted",
      actor_id: authResult.user.id,
      actor_role: authResult.user.role,
      notes: `Donation of ₹${amount} submitted with UTR ${utr}`,
      old_status: null,
      new_status: "PENDING",
    });

    await audit({
      tableName: "welfare_payments",
      recordId: payment.id,
      action: "INSERT",
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      newData: { welfare_group_id: id, amount, utr, receipt_number: receiptNumber },
    });

    const orgAdmins = await supabaseAdmin()
      .from("welfare_org_admins")
      .select("user_id")
      .eq("welfare_group_id", id);

    if (!orgAdmins.error && orgAdmins.data) {
      const adminIds = orgAdmins.data.map((a: { user_id: string }) => a.user_id);
      const notifications = adminIds.map((adminId: string) => ({
        user_id: adminId,
        type: "funding",
        title: "New donation awaiting verification",
        message: `A donation of ₹${amount} to ${org.name} has been submitted and is awaiting your verification.`,
        payload: { paymentId: payment.id, welfareGroupId: id, amount, receiptNumber },
      }));

      await supabaseAdmin().from("notifications").insert(notifications);
    }

    return ok(payment, "Payment claim submitted. Awaiting verification.");
  } catch {
    return serverError();
  }
}
