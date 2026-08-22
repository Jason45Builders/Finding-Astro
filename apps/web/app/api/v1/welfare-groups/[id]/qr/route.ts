import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, badRequest } from "@/lib/api-response";
import QRCode from "qrcode";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const { data: org, error: orgError } = await supabaseAdmin()
      .from("welfare_orgs")
      .select("upi_id, upi_name, payment_enabled, is_active")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (orgError || !org) return notFound("Welfare group not found");
    if (!org.payment_enabled) return badRequest("PAYMENTS_DISABLED", "This welfare group is not accepting donations");
    if (!org.upi_id) return badRequest("NO_UPI", "This welfare group has not configured a UPI ID");

    const upiString = `upi://pay?pa=${encodeURIComponent(org.upi_id)}&pn=${encodeURIComponent(org.upi_name || org.upi_id)}&cu=INR`;

    const qrDataUrl = await QRCode.toDataURL(upiString, {
      width: 400,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });

    return ok({ qrDataUrl, upiId: org.upi_id, upiName: org.upi_name }, "QR code generated");
  } catch {
    return serverError();
  }
}
