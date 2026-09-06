import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, forbidden, badRequest } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { mapWelfarePayment } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`payment-verify:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const { id } = await params;
    const { data: payment, error: paymentError } = await supabaseAdmin()
      .from("welfare_payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (paymentError || !payment) return notFound("Payment not found");

    if (payment.status !== "PENDING") {
      return badRequest("INVALID_STATUS", `Cannot verify payment with status: ${payment.status}`);
    }

    const isAdmin = ["admin", "govt"].includes(authResult.user.role);
    const isOrgAdmin = await isWelfareOrgAdmin(payment.welfare_group_id, authResult.user.id);

    if (!isAdmin && !isOrgAdmin) return forbidden("Insufficient permissions");

    const { data, error } = await supabaseAdmin()
      .from("welfare_payments")
      .update({
        status: "VERIFIED",
        verified_by: authResult.user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);

    await supabaseAdmin().from("welfare_payment_events").insert({
      welfare_payment_id: id,
      event_type: "verified",
      actor_id: authResult.user.id,
      actor_role: authResult.user.role,
      notes: `Payment verified: ₹${payment.amount} with UTR ${payment.utr}`,
      old_status: "PENDING",
      new_status: "VERIFIED",
    });

    await audit({
      tableName: "welfare_payments",
      recordId: id,
      action: "APPROVE",
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      newData: { status: "VERIFIED", verified_by: authResult.user.id },
    });

    await supabaseAdmin().from("notifications").insert({
      user_id: payment.donor_id,
      type: "funding",
      title: "Donation verified",
      message: `Your donation of ₹${payment.amount} has been verified by the welfare group. Thank you for your support!`,
      payload: { paymentId: payment.id, welfareGroupId: payment.welfare_group_id, amount: payment.amount },
    });

    return ok(mapWelfarePayment(data), "Payment verified");
  } catch {
    return serverError();
  }
}

async function isWelfareOrgAdmin(welfareGroupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("welfare_org_admins")
    .select("id")
    .eq("welfare_group_id", welfareGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data && !error;
}
