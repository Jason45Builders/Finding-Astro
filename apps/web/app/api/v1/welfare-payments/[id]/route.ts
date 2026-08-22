import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, forbidden } from "@/lib/api-response";
import { generateDonorReceipt } from "@/lib/donor-receipt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "text";

    const { data: payment, error: paymentError } = await supabaseAdmin()
      .from("welfare_payments")
      .select(`
        *,
        welfare_orgs (name, upi_id, upi_name, address)
      `)
      .eq("id", id)
      .maybeSingle();

    if (paymentError || !payment) return notFound("Payment not found");

    const isAdmin = ["admin", "govt"].includes(authResult.user.role);
    const isOrgAdmin = await isWelfareOrgAdmin(payment.welfare_group_id, authResult.user.id);
    const isDonor = payment.donor_id === authResult.user.id;

    if (!isAdmin && !isOrgAdmin && !isDonor) return forbidden("Insufficient permissions");

    const org = payment.welfare_orgs as { name: string; upi_id: string; upi_name: string; address: string | null } | null;

    const receipt = generateDonorReceipt({
      receiptNumber: payment.receipt_number,
      welfareGroup: org?.name ?? "Unknown Welfare Group",
      welfareGroupAddress: org?.address ?? null,
      amount: Number(payment.amount),
      currency: payment.currency,
      donorName: payment.donor_name,
      paymentDate: payment.payment_date,
      utr: payment.utr,
      status: payment.status,
      purpose: payment.purpose,
      note: payment.note,
      upiIdSnapshot: payment.upi_id_snapshot,
      upiNameSnapshot: payment.upi_name_snapshot,
      verifiedAt: payment.verified_at,
      rejectionReason: payment.rejection_reason,
      createdAt: payment.created_at,
    });

    if (format === "json") {
      return ok({
        receiptNumber: payment.receipt_number,
        welfareGroup: org?.name ?? "Unknown Welfare Group",
        welfareGroupAddress: org?.address ?? null,
        amount: Number(payment.amount),
        currency: payment.currency,
        donorName: payment.donor_name,
        paymentDate: payment.payment_date,
        utr: payment.utr,
        status: payment.status,
        purpose: payment.purpose,
        note: payment.note,
        upiIdSnapshot: payment.upi_id_snapshot,
        upiNameSnapshot: payment.upi_name_snapshot,
        verifiedAt: payment.verified_at,
        rejectionReason: payment.rejection_reason,
        createdAt: payment.created_at,
        receiptText: receipt,
      }, "Receipt loaded");
    }

    return new NextResponse(receipt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="receipt-${payment.receipt_number}.txt"`,
      },
    });
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
