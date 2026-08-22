import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, forbidden, badRequest } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapWelfarePayment } from "@/lib/types";

const RejectSchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = validateBody(RejectSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { reason } = parsed.data;

    const { data: payment, error: paymentError } = await supabaseAdmin()
      .from("welfare_payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (paymentError || !payment) return notFound("Payment not found");

    if (payment.status !== "PENDING") {
      return badRequest("INVALID_STATUS", `Cannot reject payment with status: ${payment.status}`);
    }

    const isAdmin = ["admin", "govt"].includes(authResult.user.role);
    const isOrgAdmin = await isWelfareOrgAdmin(payment.welfare_group_id, authResult.user.id);

    if (!isAdmin && !isOrgAdmin) return forbidden("Insufficient permissions");

    const { data, error } = await supabaseAdmin()
      .from("welfare_payments")
      .update({
        status: "REJECTED",
        rejection_reason: reason,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);

    await supabaseAdmin().from("welfare_payment_events").insert({
      welfare_payment_id: id,
      event_type: "rejected",
      actor_id: authResult.user.id,
      actor_role: authResult.user.role,
      notes: `Payment rejected: ${reason}`,
      old_status: "PENDING",
      new_status: "REJECTED",
    });

    await audit({
      tableName: "welfare_payments",
      recordId: id,
      action: "REJECT",
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      newData: { status: "REJECTED", rejection_reason: reason },
    });

    await supabaseAdmin().from("notifications").insert({
      user_id: payment.donor_id,
      type: "funding",
      title: "Donation could not be verified",
      message: `Your payment claim of ₹${payment.amount} could not be verified. Reason: ${reason}. Please contact the welfare group if you believe this is an error.`,
      payload: { paymentId: payment.id, welfareGroupId: payment.welfare_group_id, reason },
    });

    return ok(mapWelfarePayment(data), "Payment rejected");
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
