import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound, forbidden } from "@/lib/api-response";
import { audit } from "@/lib/audit";
import { mapWelfareGroup } from "@/lib/types";
import { isValidUpiId } from "@/lib/welfare-payment-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin()
      .from("welfare_orgs")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Welfare group not found");

    const mapped = mapWelfareGroup(data);
    return ok(mapped, "Welfare group loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

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
    const allowed: Record<string, unknown> = {};
    if (isAdmin) {
      if (raw.name !== undefined) allowed.name = raw.name;
      if (raw.org_type !== undefined) allowed.org_type = raw.org_type;
      if (raw.address !== undefined) allowed.address = raw.address;
      if (raw.city !== undefined) allowed.city = raw.city;
      if (raw.phone !== undefined) allowed.phone = raw.phone;
      if (raw.email !== undefined) allowed.email = raw.email;
      if (raw.website !== undefined) allowed.website = raw.website;
      if (raw.is_verified !== undefined) allowed.is_verified = raw.is_verified;
      if (raw.is_active !== undefined) allowed.is_active = raw.is_active;
    }
    if (isAdmin || isOrgAdmin) {
      if (raw.upi_id !== undefined) {
        const upi = String(raw.upi_id).trim();
        if (upi && !isValidUpiId(upi)) return badRequest("INVALID_UPI", "Invalid UPI ID format");
        allowed.upi_id = upi || null;
      }
      if (raw.upi_name !== undefined) allowed.upi_name = raw.upi_name ? String(raw.upi_name).trim() : null;
      if (raw.payment_enabled !== undefined) allowed.payment_enabled = Boolean(raw.payment_enabled);
      if (raw.upi_verified !== undefined && isAdmin) allowed.upi_verified = Boolean(raw.upi_verified);
      if (raw.upi_verified_at !== undefined && isAdmin) allowed.upi_verified_at = raw.upi_verified_at ? new Date(raw.upi_verified_at).toISOString() : null;
      if (raw.upi_verified_by !== undefined && isAdmin) allowed.upi_verified_by = raw.upi_verified_by || null;
    }

    if (Object.keys(allowed).length === 0) return forbidden("No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("welfare_orgs")
      .update(allowed)
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
      newData: allowed,
    });

    return ok(mapWelfareGroup(data), "Welfare group updated");
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

function badRequest(code: string, message: string) {
  return NextResponse.json({ success: false, code, message }, { status: 400 });
}
