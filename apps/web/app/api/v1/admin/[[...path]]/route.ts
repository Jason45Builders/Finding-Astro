import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, serverError, badRequest, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { GUEST_USER_ID } from "@/lib/guest";
import { mapCase } from "@/lib/types";
import { decodeLocation } from "@/lib/geo";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

function mapAdminUser(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    fullName: row.full_name as string | null,
    role: row.role as string,
    identityTier: row.identity_tier as number,
    isBanned: (row.is_banned as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

const PRIVILEGED_ROLES = ["ngo", "govt", "admin"];

function checkPrivileged(user: { role: string }) {
  if (!PRIVILEGED_ROLES.includes(user.role)) return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Insufficient permissions" }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/admin\//, "").split("/").filter(Boolean);
  const subResource = pathParts[0];

  try {
    if (subResource === "verifications") {
      const type = pathParts[1];
      if (type === "ngo") {
        const { data, error } = await supabaseAdmin().from("ngo_verifications").select("*").order("created_at", { ascending: false });
        if (error) return serverError(error.message);
        return ok(data ?? [], "Loaded");
      }
      if (type === "identity") {
        const { data, error } = await supabaseAdmin().from("identity_verifications").select("*").order("created_at", { ascending: false });
        if (error) return serverError(error.message);
        return ok(data ?? [], "Loaded");
      }
      const { data: ngo, error: ngoError } = await supabaseAdmin().from("ngo_verifications").select("*");
      const { data: identity, error: identityError } = await supabaseAdmin().from("identity_verifications").select("*");
      if (ngoError) return serverError(ngoError.message);
      if (identityError) return serverError(identityError.message);
      return ok({ ngo: ngo ?? [], identity: identity ?? [] }, "Loaded");
    }

    if (subResource === "reimbursements") {
      const { data, error } = await supabaseAdmin().from("reimbursement_requests").select("*").order("created_at", { ascending: false });
      if (error) return serverError(error.message);
      return ok(data ?? [], "Loaded");
    }

    if (subResource === "cases") {
      const caseType = url.searchParams.get("caseType");
      const status = url.searchParams.get("status");
      const ward = url.searchParams.get("ward");
      let query = supabaseAdmin().from("cases").select("*").order("created_at", { ascending: false });
      if (caseType) query = query.eq("case_type", caseType);
      if (status) query = query.eq("status", status);
      // "cases" has no ward_name column - the admin search box doubles as a
      // location/id lookup, so match against location_text or the case id.
      // A raw .or() would throw if a non-UUID string is compared against the
      // uuid id column, so only add that clause when it actually looks like one.
      if (ward) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ward);
        if (isUuid) {
          query = query.or(`location_text.ilike.%${ward}%,id.eq.${ward}`);
        } else {
          const sanitized = ward.replace(/[%_]/g, "\\$&");
          query = query.ilike("location_text", `%${sanitized}%`);
        }
      }
      const { data, error } = await query;
      if (error) return serverError(error.message);
      return ok((data ?? []).map((row) => mapCase({ ...row, location: decodeLocation(row.location) })), "Loaded");
    }

    if (subResource === "users") {
      const userId = pathParts[1];
      if (userId) {
        const { data, error } = await supabaseAdmin().from("users").select("*").eq("id", userId).single();
        if (error) return serverError(error.message);
        return ok(mapAdminUser(data), "User loaded");
      }
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
      const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
      const roleFilter = url.searchParams.get("role");
      const search = url.searchParams.get("search");
      let query = supabaseAdmin().from("users").select("id, email, full_name, role, identity_tier, is_banned, created_at", { count: "exact" });
      if (roleFilter) query = query.eq("role", roleFilter);
      if (search) {
        const sanitized = search.replace(/[%_]/g, "\\$&");
        query = query.or(`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%`);
      }
      const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (error) return serverError(error.message);
      return ok((data ?? []).map(mapAdminUser), "Users loaded", { count: count ?? data?.length ?? 0 });
    }

    if (subResource === "partner-requests") {
      const { data: clinics, error: cErr } = await supabaseAdmin().from("partner_clinics").select("*").eq("is_verified", false).order("created_at", { ascending: false });
      const { data: stores, error: sErr } = await supabaseAdmin().from("partner_stores").select("*").eq("is_verified", false).order("created_at", { ascending: false });
      if (cErr) return serverError(cErr.message);
      if (sErr) return serverError(sErr.message);
      const combined = [
        ...(clinics ?? []).map((r: any) => ({ ...r, type: "clinic" as const })),
        ...(stores ?? []).map((r: any) => ({ ...r, type: "store" as const })),
      ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return ok(combined, "Pending partner requests loaded", { count: combined.length });
    }

    return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown admin resource" }, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`admin:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/admin\//, "").split("/").filter(Boolean);
  const subResource = pathParts[0];

  try {
    if (subResource === "verifications" && pathParts.length === 1) {
      const raw = await req.json();
      const parsed = validateBody(z.object({ user_id: z.string().uuid(), org_name: z.string().optional(), org_type: z.string().optional(), registration_number: z.string().optional(), document_urls: z.array(z.string()).optional(), requested_tier: z.number().int().optional(), document_type: z.string().optional(), document_ref: z.string().optional() }).passthrough(), raw);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data as Record<string, unknown>;
      const table = body.document_type ? "identity_verifications" : "ngo_verifications";
      const { data, error } = await supabaseAdmin().from(table).insert(body).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Verification created");
    }

    if (subResource === "verifications" && pathParts[1] === "ngo") {
      const privileged = ["admin", "govt"];
      if (!privileged.includes(authResult.user.role)) {
        return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Only admins and government officers can approve NGO verifications" }, { status: 403 });
      }
      const raw = await req.json();
      const parsed = validateBody(z.object({ verificationId: z.string().uuid(), approved: z.boolean(), notes: z.string().optional() }), raw);
      if (!parsed.ok) return parsed.response;
      const { verificationId, approved, notes } = parsed.data;
      const newStatus = approved ? "approved" : "rejected";
      const reviewerId = authResult.user.id;
      const { error } = await supabaseAdmin().from("ngo_verifications").update({ status: newStatus, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes ?? null }).eq("id", verificationId);
      if (error) return serverError(error.message);
      const { data: verification } = await supabaseAdmin().from("ngo_verifications").select("user_id, requested_tier, org_name, org_type, address, welfare_org_id").eq("id", verificationId).single();
      if (approved && verification) {
        if (verification.user_id === reviewerId) {
          return NextResponse.json({ success: false, code: "FORBIDDEN", message: "You cannot approve your own verification" }, { status: 403 });
        }
        const requestedTier = Number(verification.requested_tier ?? 3);
        const MAX_NGO_TIER = 3;
        const tier = Math.min(requestedTier, MAX_NGO_TIER);
        if (requestedTier > MAX_NGO_TIER && authResult.user.role !== "admin") {
          return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Only platform administrators can grant elevated tiers" }, { status: 403 });
        }
        await supabaseAdmin().from("users").update({ role: "ngo", identity_tier: tier }).eq("id", verification.user_id);
        if (!verification.welfare_org_id) {
          const { data: welfareOrg, error: orgError } = await supabaseAdmin().from("welfare_orgs").insert({
            name: verification.org_name,
            org_type: verification.org_type ?? "ngo",
            address: verification.address ?? null,
            is_verified: true,
            is_active: true,
            payment_enabled: false,
            upi_verified: false,
          }).select("id").single();
          if (!orgError && welfareOrg) {
            await supabaseAdmin().from("welfare_org_admins").insert({ welfare_group_id: welfareOrg.id, user_id: verification.user_id });
            await supabaseAdmin().from("ngo_verifications").update({ welfare_org_id: welfareOrg.id }).eq("id", verificationId);
          }
        }
      }
      await audit({ tableName: "ngo_verifications", recordId: verificationId, action: "UPDATE", actorId: reviewerId, actorRole: authResult.user.role, newData: { status: newStatus, user_id: verification?.user_id, welfare_org_id: verification?.welfare_org_id } });
      return ok(null, `Verification ${newStatus}`);
    }

    if (subResource === "verifications" && pathParts[1] === "identity") {
      const raw = await req.json();
      const parsed = validateBody(z.object({ verificationId: z.string().uuid(), approved: z.boolean(), notes: z.string().optional() }), raw);
      if (!parsed.ok) return parsed.response;
      const { verificationId, approved, notes } = parsed.data;
      const newStatus = approved ? "approved" : "rejected";
      const { data: existingVerification, error: fetchError } = await supabaseAdmin().from("identity_verifications").select("user_id").eq("id", verificationId).single();
      if (fetchError || !existingVerification) return serverError("Verification not found");
      const actualUserId = (existingVerification as Record<string, unknown>).user_id as string;
      const { data, error } = await supabaseAdmin().from("identity_verifications").insert({
        user_id: actualUserId, reviewed_by: authResult.user.id, status: newStatus, reviewed_at: new Date().toISOString(),
      }).select("*").single();
      if (error) return serverError(error.message);
      if (approved) {
        await supabaseAdmin().from("users").update({ identity_tier: 2 }).eq("id", actualUserId);
      }
      await audit({ tableName: "identity_verifications", recordId: verificationId, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
      return ok(data, "Identity verification processed");
    }

    if (subResource === "reimbursements" && pathParts.length === 1) {
      const raw = await req.json();
      const parsed = validateBody(z.object({ case_id: z.string().uuid(), volunteer_id: z.string().uuid(), amount_claimed: z.number().positive(), bill_url: z.string().url(), prescription_url: z.string().url(), doctor_name: z.string(), hospital_id: z.string().uuid() }).passthrough(), raw);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data as Record<string, unknown>;
      const { data, error } = await supabaseAdmin().from("reimbursement_requests").insert(body).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Reimbursement created");
    }

    if (subResource === "reimbursements" && pathParts[1] === "approve") {
      const raw = await req.json();
      const parsed = validateBody(z.object({ reimbursementId: z.string().uuid(), approved: z.boolean() }), raw);
      if (!parsed.ok) return parsed.response;
      const { reimbursementId, approved } = parsed.data;
      const { data: existing, error: fetchError } = await supabaseAdmin().from("reimbursement_requests").select("*").eq("id", reimbursementId).single();
      if (fetchError || !existing) return serverError("Reimbursement request not found");
      const hasProof = !!existing.bill_url && !!existing.prescription_url;
      const { data: hospitalVerify } = await supabaseAdmin().from("hospital_verifications").select("verified").eq("reimbursement_id", reimbursementId).eq("verified", true).maybeSingle();
      const hospitalVerified = !!hospitalVerify;
      const { data: relatedCase } = await supabaseAdmin().from("cases").select("status").eq("id", existing.case_id).single();
      const surgeryDone = relatedCase ? ["resolved", "closed", "action_taken"].includes(relatedCase.status) : false;
      if (!hasProof || !hospitalVerified || !surgeryDone) {
        return ok({ approved: false, gates: { proof: hasProof, hospitalVerified, surgeryDone }, message: "Not all gates passed" }, "Gates not cleared");
      }
      if (!approved) {
        const { error: updateError } = await supabaseAdmin().from("reimbursement_requests").update({ status: "REJECTED", updated_at: new Date().toISOString() }).eq("id", reimbursementId);
        if (updateError) return serverError(updateError.message);
        await audit({ tableName: "reimbursement_requests", recordId: reimbursementId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { status: "REJECTED" } });
        return ok({ approved: false, gates: { proof: hasProof, hospitalVerified, surgeryDone } }, "Reimbursement rejected");
      }
      const { data, error } = await supabaseAdmin().from("reimbursement_requests").update({ status: "VERIFIED", updated_at: new Date().toISOString() }).eq("id", reimbursementId).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "reimbursement_requests", recordId: reimbursementId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { status: "VERIFIED" } });
      return ok({ ...data, approved: true, gates: { proof: hasProof, hospitalVerified, surgeryDone } }, "Reimbursement approved");
    }

    if (subResource === "funding" && pathParts[1] === "release-payout") {
      const raw = await req.json();
      const parsed = validateBody(z.object({ fundingCaseId: z.string().uuid() }), raw);
      if (!parsed.ok) return parsed.response;
      const { fundingCaseId } = parsed.data;
      const { data: fundingCase, error: fcError } = await supabaseAdmin().from("funding_cases").select("*").eq("id", fundingCaseId).maybeSingle();
      if (fcError || !fundingCase) return notFound("Funding case not found");
      if (fundingCase.status === "CLOSED") return badRequest("CONFLICT", "Funding case is already closed");
      const { data: successTxs } = await supabaseAdmin().from("funding_transactions").select("id").eq("funding_case_id", fundingCaseId).eq("payment_status", "SUCCESS").limit(1);
      if (!successTxs || successTxs.length === 0) return badRequest("NO_TRANSACTIONS", "Cannot release payout: no successful donations recorded");
      const unallocated = Number(fundingCase.amount_raised ?? 0) - (Number(fundingCase.amount_disbursed ?? 0));
      if (unallocated <= 0) return badRequest("NO_FUNDS", "No unallocated funds available for payout");
      const MAX_PAYOUT = 5_000_000;
      if (unallocated > MAX_PAYOUT) return badRequest("AMOUNT_TOO_HIGH", `Payout amount exceeds maximum allowed (₹${MAX_PAYOUT})`);
      const caseCreatedAt = new Date((fundingCase as Record<string, unknown>).created_at as string).getTime();
      if (unallocated > 100_000 && Date.now() - caseCreatedAt < 24 * 60 * 60 * 1000) {
        return badRequest("COOLING_PERIOD", "Payouts above ₹1,00,000 require a 24-hour cooling period after funding case creation");
      }
      const { data: payout, error: payoutError } = await supabaseAdmin().from("payouts").insert({
        funding_case_id: fundingCaseId,
        recipient_type: "HOSPITAL",
        recipient_id: fundingCase.case_id,
        amount: unallocated,
        status: "RELEASED",
      }).select("*").single();
      if (payoutError) return serverError(payoutError.message);
      await supabaseAdmin().from("funding_cases").update({ status: "CLOSED", updated_at: new Date().toISOString() }).eq("id", fundingCaseId);
      await audit({ tableName: "payouts", recordId: payout.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: payout });
      return ok(payout, "Payout released");
    }

    if (subResource === "partner-requests") {
      const target = pathParts[1];
      const action = pathParts[2];

      if (!target || !action) {
        const { data: clinics, error: cErr } = await supabaseAdmin().from("partner_clinics").select("*").eq("is_verified", false).order("created_at", { ascending: false });
        const { data: stores, error: sErr } = await supabaseAdmin().from("partner_stores").select("*").eq("is_verified", false).order("created_at", { ascending: false });
        if (cErr) return serverError(cErr.message);
        if (sErr) return serverError(sErr.message);
        const combined = [
          ...(clinics ?? []).map((r: any) => ({ ...r, type: "clinic" as const })),
          ...(stores ?? []).map((r: any) => ({ ...r, type: "store" as const })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return ok(combined, "Pending partner requests loaded");
      }

      const raw = await req.json();
      const parsed = validateBody(z.object({ note: z.string().optional() }), raw);
      if (!parsed.ok) return parsed.response;
      const { note } = parsed.data as { note?: string };
      const isApprove = action === "approve";

      const { data: clinicRow } = await supabaseAdmin().from("partner_clinics").select("*").eq("id", target).maybeSingle();
      const { data: storeRow } = await supabaseAdmin().from("partner_stores").select("*").eq("id", target).maybeSingle();
      if (clinicRow) {
        const { data, error } = await supabaseAdmin().from("partner_clinics").update({ is_verified: isApprove, is_active: isApprove, notes: note ?? null }).eq("id", target).select("*").single();
        if (error) return serverError(error.message);
        await audit({ tableName: "partner_clinics", recordId: target, action: isApprove ? "APPROVE" : "REJECT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
        return ok(data, isApprove ? "Clinic request approved" : "Clinic request rejected");
      }
      if (storeRow) {
        const updatePayload: Record<string, unknown> = { is_verified: isApprove, is_active: isApprove };
        const { data, error } = await supabaseAdmin().from("partner_stores").update(updatePayload).eq("id", target).select("*").single();
        if (error) return serverError(error.message);
        await audit({ tableName: "partner_stores", recordId: target, action: isApprove ? "APPROVE" : "REJECT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
        return ok(data, isApprove ? "Store request approved" : "Store request rejected");
      }
      return serverError("Partner request not found");
    }

    return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown admin action" }, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`admin:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/admin\//, "").split("/").filter(Boolean);

  try {
    if (pathParts[0] === "cases" && pathParts.length > 1) {
      const caseId = pathParts[1];
      const raw = await req.json();
      const parsed = validateBody(z.object({
        status: z.enum(["open", "in_review", "action_taken", "resolved", "closed"]).optional(),
        resolutionNotes: z.string().optional(),
      }), raw);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data as Record<string, unknown>;

      const { data: existing, error: fetchError } = await supabaseAdmin().from("cases").select("status, priority, title, description, resolution_notes").eq("id", caseId).single();
      if (fetchError || !existing) return notFound("Case not found");

      const currentStatus = (existing as Record<string, unknown>).status as string;
      if (body.status !== undefined && currentStatus !== body.status) {
        const allowed: Record<string, string[]> = { open: ["in_review", "closed"], in_review: ["action_taken", "resolved", "closed"], action_taken: ["resolved", "closed"], resolved: ["closed"] };
        if (!(allowed[currentStatus] ?? []).includes(body.status as string)) {
          return badRequest("INVALID_STATUS_TRANSITION", `Cannot move case from "${currentStatus}" to "${body.status}"`);
        }
      }

      const update: Record<string, unknown> = {};
      if (body.status !== undefined) update.status = body.status;
      if (body.resolutionNotes !== undefined) update.resolution_notes = body.resolutionNotes;
      update.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin().from("cases").update(update).eq("id", caseId).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "cases", recordId: caseId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: existing, newData: data });
      return ok(mapCase({ ...data, location: decodeLocation(data.location) }), "Case updated");
    }

    if (pathParts[0] === "users" && pathParts.length > 1) {
      const userId = pathParts[1];
      const raw = await req.json();
      const parsed = validateBody(z.object({ isBanned: z.boolean().optional(), role: z.string().optional(), identityTier: z.number().int().nonnegative().optional() }), raw);
      if (!parsed.ok) return parsed.response;
      const { isBanned, role, identityTier } = parsed.data;

      if (userId === authResult.user.id && role !== undefined) {
        return NextResponse.json({ success: false, code: "FORBIDDEN", message: "You cannot change your own role" }, { status: 403 });
      }

      const { data: targetUser, error: targetError } = await supabaseAdmin().from("users").select("role, identity_tier").eq("id", userId).single();
      if (targetError || !targetUser) return badRequest("NOT_FOUND", "Target user not found");
      const targetRole = (targetUser as Record<string, unknown>).role as string;
      const targetTier = Number((targetUser as Record<string, unknown>).identity_tier ?? 0);

      const ROLE_HIERARCHY: Record<string, number> = { citizen: 0, ngo: 1, hospital: 2, govt: 3, admin: 4 };
      const actorLevel = ROLE_HIERARCHY[authResult.user.role] ?? -1;
      const targetLevel = ROLE_HIERARCHY[targetRole] ?? -1;

      if (role !== undefined) {
        const newLevel = ROLE_HIERARCHY[role] ?? -1;
        if (newLevel > actorLevel) return NextResponse.json({ success: false, code: "FORBIDDEN", message: "You cannot assign a role higher than your own" }, { status: 403 });
        if (targetLevel >= actorLevel && targetRole !== role) return NextResponse.json({ success: false, code: "FORBIDDEN", message: "You cannot modify a user with equal or higher role" }, { status: 403 });
      }

      if (identityTier !== undefined && identityTier > (authResult.user.identityTier ?? 0)) {
        return NextResponse.json({ success: false, code: "FORBIDDEN", message: "You cannot assign an identity tier higher than your own" }, { status: 403 });
      }
      if (identityTier !== undefined && identityTier > targetTier && authResult.user.role !== "admin") {
        return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Only platform administrators can elevate identity tiers" }, { status: 403 });
      }

      const update: Record<string, unknown> = {};
      if (isBanned !== undefined) update.is_banned = isBanned;
      if (role !== undefined) update.role = role;
      if (identityTier !== undefined) update.identity_tier = identityTier;
      const { data, error } = await supabaseAdmin().from("users").update(update).eq("id", userId).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "users", recordId: userId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: targetUser, newData: data });
      return ok(mapAdminUser(data), "User updated");
    }

    return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown admin resource" }, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`admin:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/admin\//, "").split("/").filter(Boolean);

  try {
    if (pathParts[0] === "users" && pathParts.length > 1) {
      const userId = pathParts[1];
      if (userId === GUEST_USER_ID) {
        return NextResponse.json({ success: false, code: "FORBIDDEN", message: "Cannot delete guest system user" }, { status: 403 });
      }
      const { error } = await supabaseAdmin().from("users").delete().eq("id", userId);
      if (error) return serverError(error.message);
      await audit({ tableName: "users", recordId: userId, action: "DELETE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: undefined });
      return ok(null, "User deleted");
    }

    if (pathParts[0] === "verifications" && pathParts.length > 1) {
      const verificationId = pathParts[1];
      const table = pathParts[2] === "identity" ? "identity_verifications" : "ngo_verifications";
      const { error } = await supabaseAdmin().from(table).delete().eq("id", verificationId);
      if (error) return serverError(error.message);
      await audit({ tableName: table, recordId: verificationId, action: "DELETE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: undefined });
      return ok(null, "Verification deleted");
    }

    if (pathParts[0] === "cases" && pathParts.length > 1) {
      const caseId = pathParts[1];
      const { error } = await supabaseAdmin().from("cases").delete().eq("id", caseId);
      if (error) return serverError(error.message);
      await audit({ tableName: "cases", recordId: caseId, action: "DELETE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: undefined });
      return ok(null, "Case deleted");
    }

    return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown admin resource" }, { status: 404 });
  } catch {
    return serverError();
  }
}
