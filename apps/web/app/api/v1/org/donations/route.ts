import { NextRequest } from "next/server";
import { requireOrg, OrgContext } from "@/lib/org-auth";
import { requireCsrf } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { isValidUpiId, generateReceiptNumber } from "@/lib/welfare-payment-utils";

function mapSettings(row: any) {
  return {
    welfareGroupId: row.welfare_group_id,
    donationAdminUserId: row.donation_admin_user_id,
    donationAdminName: row.donation_admin?.full_name ?? null,
    upiId: row.upi_id,
    upiName: row.upi_name,
    monthlyTargetInr: row.monthly_target_inr === null ? null : Number(row.monthly_target_inr),
    donationsEnabled: row.donations_enabled,
    updatedAt: row.updated_at,
  };
}

function mapDonation(row: any) {
  return {
    id: row.id,
    welfareGroupId: row.welfare_group_id,
    donorId: row.donor_id,
    donorName: row.is_anonymous ? "Anonymous member" : (row.donor?.full_name ?? row.donor_name ?? "Member"),
    amount: Number(row.amount),
    currency: row.currency,
    utr: row.utr,
    paymentDate: row.payment_date,
    purpose: row.purpose,
    note: row.note,
    proofUrl: row.proof_url,
    status: row.status,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    rejectionReason: row.rejection_reason,
    receiptNumber: row.receipt_number,
    isAnonymous: row.is_anonymous,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getGroupContext(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;
  const org = (authResult as { org: OrgContext }).org;
  const user = (authResult as { user: { id: string } }).user;
  const admin = supabaseAdmin();

  const { data: group, error } = await admin
    .from("welfare_orgs")
    .select("id, org_type, name")
    .eq("id", org.welfareGroupId)
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!group) return new Response(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Welfare group not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  if (group.org_type !== "rescue_collective") {
    return forbidden("UPI monthly collection is currently available only for Rescue Collectives");
  }

  return { org, user, group, admin };
}

async function loadSettings(admin: any, welfareGroupId: string) {
  return admin
    .from("rescue_collective_donation_settings")
    .select("*, donation_admin:users!rescue_collective_donation_settings_donation_admin_user_id_fkey(id, full_name)")
    .eq("welfare_group_id", welfareGroupId)
    .maybeSingle();
}

export async function GET(req: NextRequest) {
  const context = await getGroupContext(req);
  if (context instanceof Response) return context;
  const { org, user, admin } = context;

  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("INVALID_MONTH", "Month must be YYYY-MM");

    const { data: settings, error: settingsError } = await loadSettings(admin, org.welfareGroupId);
    if (settingsError) return serverError(settingsError.message);

    const start = `${month}-01`;
    const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);

    const { data: donations, error: donationsError } = await admin
      .from("welfare_payments")
      .select("id, welfare_group_id, donor_id, amount, currency, utr, payment_date, purpose, note, proof_url, status, verified_by, verified_at, rejection_reason, receipt_number, donor_name, is_anonymous, created_at, updated_at, donor:users!welfare_payments_donor_id_fkey(id, full_name)")
      .eq("welfare_group_id", org.welfareGroupId)
      .gte("payment_date", start)
      .lt("payment_date", next)
      .order("created_at", { ascending: false })
      .limit(500);

    if (donationsError) return serverError(donationsError.message);

    const rows = donations ?? [];
    const verified = rows.filter((d: any) => d.status === "VERIFIED");
    const pending = rows.filter((d: any) => d.status === "PENDING");
    const totalVerified = verified.reduce((sum: number, d: any) => sum + Number(d.amount), 0);

    return ok({
      settings: settings ? mapSettings(settings) : null,
      month,
      summary: {
        verifiedAmountInr: totalVerified,
        verifiedCount: verified.length,
        pendingCount: pending.length,
        donationCount: rows.length,
        targetInr: settings?.monthly_target_inr === null || settings?.monthly_target_inr === undefined ? null : Number(settings.monthly_target_inr),
      },
      donations: rows.map(mapDonation),
      currentUserIsDonationAdmin: settings?.donation_admin_user_id === user.id,
    }, "Rescue collective donations loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const context = await getGroupContext(req);
  if (context instanceof Response) return context;
  const { org, user, admin } = context;

  try {
    const body = await req.json();
    const { data: settings, error: settingsError } = await loadSettings(admin, org.welfareGroupId);
    if (settingsError) return serverError(settingsError.message);
    if (!settings) return badRequest("DONATIONS_NOT_CONFIGURED", "The donation admin has not configured UPI collection yet");
    if (!settings.donations_enabled) return badRequest("DONATIONS_CLOSED", "Monthly donations are currently closed");

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return badRequest("INVALID_AMOUNT", "Donation amount must be greater than zero");
    }

    const utr = String(body.utr ?? "").trim();
    if (!/^[A-Za-z0-9_-]{6,35}$/.test(utr)) {
      return badRequest("INVALID_UTR", "Enter the UPI transaction reference/UTR from your payment app");
    }

    const paymentDate = String(body.paymentDate ?? new Date().toISOString().slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      return badRequest("INVALID_DATE", "Payment date must be YYYY-MM-DD");
    }

    const { data: donor, error: donorError } = await admin
      .from("users")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single();
    if (donorError || !donor) return serverError(donorError?.message ?? "Unable to load donor");

    const { data, error } = await admin
      .from("welfare_payments")
      .insert({
        welfare_group_id: org.welfareGroupId,
        donor_id: user.id,
        amount,
        currency: "INR",
        upi_id_snapshot: settings.upi_id,
        upi_name_snapshot: settings.upi_name || settings.upi_id,
        utr,
        payment_date: paymentDate,
        purpose: body.purpose ? String(body.purpose).trim().slice(0, 200) : "Monthly rescue collective contribution",
        note: body.note ? String(body.note).trim().slice(0, 1000) : null,
        proof_url: body.proofUrl ? String(body.proofUrl).trim().slice(0, 1000) : null,
        status: "PENDING",
        receipt_number: generateReceiptNumber(),
        donor_name: donor.full_name,
        donor_email: donor.email,
        is_anonymous: Boolean(body.isAnonymous),
      })
      .select("id, welfare_group_id, donor_id, amount, currency, utr, payment_date, purpose, note, proof_url, status, verified_by, verified_at, rejection_reason, receipt_number, donor_name, is_anonymous, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") return badRequest("DUPLICATE_UTR", "This UPI transaction reference has already been recorded for this collective");
      return serverError(error.message);
    }

    await admin.from("welfare_payment_events").insert({
      welfare_payment_id: data.id,
      event_type: "DONATION_REPORTED",
      actor_id: user.id,
      actor_role: "member",
      notes: "Member reported a UPI payment made outside Finding Astro",
      new_status: "PENDING",
    });

    return ok(mapDonation({ ...data, donor }), "Donation reported");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const context = await getGroupContext(req);
  if (context instanceof Response) return context;
  const { org, user, admin } = context;

  try {
    const body = await req.json();
    const { data: settings, error: settingsError } = await loadSettings(admin, org.welfareGroupId);
    if (settingsError) return serverError(settingsError.message);

    const existing = settings;
    const upiId = body.upiId === undefined ? existing?.upi_id : String(body.upiId).trim();
    const upiName = body.upiName === undefined ? existing?.upi_name : (body.upiName ? String(body.upiName).trim() : null);
    const monthlyTargetInr = body.monthlyTargetInr === undefined ? existing?.monthly_target_inr : (body.monthlyTargetInr === null || body.monthlyTargetInr === "" ? null : Number(body.monthlyTargetInr));
    const donationsEnabled = body.donationsEnabled === undefined ? (existing?.donations_enabled ?? true) : Boolean(body.donationsEnabled);

    if (!upiId || !isValidUpiId(upiId)) return badRequest("INVALID_UPI", "Invalid UPI ID format");
    if (monthlyTargetInr !== null && (!Number.isFinite(monthlyTargetInr) || monthlyTargetInr < 0)) {
      return badRequest("INVALID_TARGET", "Monthly target must be zero or greater");
    }

    if (!existing) {
      if (!org.orgRole || org.orgRole !== "org_admin") return forbidden("Only an organization admin can initialize monthly donation collection");
      const { data, error } = await admin
        .from("rescue_collective_donation_settings")
        .insert({
          welfare_group_id: org.welfareGroupId,
          donation_admin_user_id: user.id,
          upi_id: upiId,
          upi_name: upiName,
          monthly_target_inr: monthlyTargetInr,
          donations_enabled: donationsEnabled,
        })
        .select("*, donation_admin:users!rescue_collective_donation_settings_donation_admin_user_id_fkey(id, full_name)")
        .single();

      if (error) {
        if (error.code === "23505") return forbidden("Donation collection was initialized by another admin. Only its designated donation admin can change it.");
        return serverError(error.message);
      }
      return ok(mapSettings(data), "Monthly UPI collection enabled");
    }

    if (existing.donation_admin_user_id !== user.id) {
      return forbidden("Only the designated donation admin can change the collection UPI or donation settings");
    }

    const { data, error } = await admin
      .from("rescue_collective_donation_settings")
      .update({
        upi_id: upiId,
        upi_name: upiName,
        monthly_target_inr: monthlyTargetInr,
        donations_enabled: donationsEnabled,
      })
      .eq("welfare_group_id", org.welfareGroupId)
      .eq("donation_admin_user_id", user.id)
      .select("*, donation_admin:users!rescue_collective_donation_settings_donation_admin_user_id_fkey(id, full_name)")
      .single();

    if (error) return serverError(error.message);
    return ok(mapSettings(data), "Donation settings updated");
  } catch {
    return serverError();
  }
}
