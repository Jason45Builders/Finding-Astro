import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, forbidden, badRequest } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { isValidUpiId } from "@/lib/welfare-payment-utils";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin()
      .from("welfare_orgs")
      .select("upi_id, upi_name, payment_enabled, upi_verified, upi_verified_at, upi_verified_by")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Welfare group not found");

    return ok({
      upiId: data.upi_id,
      upiName: data.upi_name,
      paymentEnabled: data.payment_enabled,
      upiVerified: data.upi_verified,
    }, "Payment settings loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`payment-settings:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const { id } = await params;
    const { data: org, error: orgError } = await supabaseAdmin()
      .from("welfare_orgs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (orgError || !org) return notFound("Welfare group not found");

    const isAdmin = ["admin", "govt"].includes(authResult.user.role);
    const isOrgAdmin = await isWelfareOrgAdmin(id, authResult.user.id);
    if (!isAdmin && !isOrgAdmin) return forbidden("Insufficient permissions");

    const raw = await req.json();
    const update: Record<string, unknown> = {};

    if (raw.upi_id !== undefined) {
      const upi = String(raw.upi_id).trim();
      if (upi && !isValidUpiId(upi)) return badRequest("INVALID_UPI", "Invalid UPI ID format");
      update.upi_id = upi || null;
    }
    if (raw.upi_name !== undefined) {
      update.upi_name = raw.upi_name ? String(raw.upi_name).trim() : null;
    }
    if (raw.payment_enabled !== undefined) {
      update.payment_enabled = Boolean(raw.payment_enabled);
    }
    if (raw.upi_verified !== undefined && isAdmin) {
      update.upi_verified = Boolean(raw.upi_verified);
    }
    if (raw.upi_verified_at !== undefined && isAdmin) {
      update.upi_verified_at = raw.upi_verified_at ? new Date(raw.upi_verified_at).toISOString() : null;
    }
    if (raw.upi_verified_by !== undefined && isAdmin) {
      update.upi_verified_by = raw.upi_verified_by || null;
    }

    if (Object.keys(update).length === 0) return badRequest("NO_CHANGES", "No valid fields to update");

    const { data, error } = await supabaseAdmin()
      .from("welfare_orgs")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);

    await audit({
      tableName: "welfare_orgs",
      recordId: id,
      action: "UPDATE",
      actorId: authResult.user.id,
      actorRole: authResult.user.role,
      newData: update,
    });

    return ok({
      upiId: data.upi_id,
      upiName: data.upi_name,
      paymentEnabled: data.payment_enabled,
      upiVerified: data.upi_verified,
    }, "Payment settings updated");
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
