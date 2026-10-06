import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError, notFound } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const admin = supabaseAdmin();

    const { data: group, error: groupError } = await admin
      .from("welfare_orgs")
      .select("id, name, org_type, city, address, website, is_verified, is_active")
      .eq("id", groupId)
      .eq("org_type", "rescue_collective")
      .eq("is_active", true)
      .maybeSingle();

    if (groupError) return serverError(groupError.message);
    if (!group) return notFound("Rescue Collective not found");

    const { data: settings, error: settingsError } = await admin
      .from("rescue_collective_donation_settings")
      .select("upi_id, upi_name, monthly_target_inr, donations_enabled, updated_at")
      .eq("welfare_group_id", groupId)
      .maybeSingle();

    if (settingsError) return serverError(settingsError.message);
    if (!settings || !settings.donations_enabled) {
      return notFound("Donations are not currently enabled for this Rescue Collective");
    }

    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const start = `${month}-01`;
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);

    const { data: donations, error: donationsError } = await admin
      .from("welfare_payments")
      .select("amount")
      .eq("welfare_group_id", groupId)
      .eq("status", "VERIFIED")
      .gte("payment_date", start)
      .lt("payment_date", next);

    if (donationsError) return serverError(donationsError.message);

    const verifiedAmountInr = (donations ?? []).reduce(
      (sum: number, donation: { amount: number | string }) => sum + Number(donation.amount),
      0
    );

    return ok({
      collective: {
        id: group.id,
        name: group.name,
        city: group.city,
        address: group.address,
        website: group.website,
        isVerified: group.is_verified,
      },
      donation: {
        upiId: settings.upi_id,
        upiName: settings.upi_name,
        monthlyTargetInr: settings.monthly_target_inr == null ? null : Number(settings.monthly_target_inr),
        month,
        verifiedAmountInr,
        verifiedCount: donations?.length ?? 0,
        updatedAt: settings.updated_at,
      },
    }, "Public donation page loaded");
  } catch {
    return serverError();
  }
}
