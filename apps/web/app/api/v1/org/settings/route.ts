import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapWelfareGroup } from "@/lib/types";
import { isValidUpiId } from "@/lib/welfare-payment-utils";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const { data, error } = await supabaseAdmin()
      .from("welfare_orgs")
      .select("*")
      .eq("id", org.welfareGroupId)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return new Response(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Organization not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return ok(mapWelfareGroup(data), "Settings loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  if (!hasOrgPermission(org.permissions, "settings:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const allowed: Record<string, unknown> = {};

    if (body.name !== undefined) allowed.name = String(body.name).trim();
    if (body.address !== undefined) allowed.address = body.address ?? null;
    if (body.city !== undefined) allowed.city = body.city ?? null;
    if (body.phone !== undefined) allowed.phone = body.phone ?? null;
    if (body.email !== undefined) allowed.email = body.email ?? null;
    if (body.website !== undefined) allowed.website = body.website ?? null;
    if (body.upiId !== undefined) {
      const upi = String(body.upiId).trim();
      if (upi && !isValidUpiId(upi)) return badRequest("INVALID_UPI", "Invalid UPI ID format");
      allowed.upi_id = upi || null;
    }
    if (body.upiName !== undefined) allowed.upi_name = body.upiName ? String(body.upiName).trim() : null;
    if (body.paymentEnabled !== undefined) allowed.payment_enabled = Boolean(body.paymentEnabled);

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("welfare_orgs")
      .update(allowed)
      .eq("id", org.welfareGroupId)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapWelfareGroup(data), "Settings updated");
  } catch {
    return serverError();
  }
}