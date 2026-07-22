import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { GUEST_USER_ID } from "@/lib/guest";

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
      if (ward) query = query.eq("ward_name", ward);
      const { data, error } = await query;
      if (error) return serverError(error.message);
      return ok(data ?? [], "Loaded");
    }

    if (subResource === "users") {
      const userId = pathParts[1];
      if (userId) {
        const { data, error } = await supabaseAdmin().from("users").select("*").eq("id", userId).single();
        if (error) return serverError(error.message);
        return ok(data, "User loaded");
      }
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 200);
      const { data, error } = await supabaseAdmin().from("users").select("id, email, full_name, role, identity_tier, is_banned, created_at").limit(limit);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Users loaded", { count: data?.length ?? 0 });
    }

    if (subResource === "partner-requests") {
      const { data: clinics, error: cErr } = await supabaseAdmin().from("partner_clinics").select("*").eq("is_verified", false).order("created_at", { ascending: false });
      const { data: stores, error: sErr } = await supabaseAdmin().from("partner_stores").select("*").eq("is_verified", false).order("created_at", { ascending: false });
      if (cErr) return serverError(cErr.message);
      if (sErr) return serverError(sErr.message);
      const combined = [
        ...(clinics ?? []).map((r: any) => ({ ...r, partnerType: "clinic" as const })),
        ...(stores ?? []).map((r: any) => ({ ...r, partnerType: "store" as const })),
      ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return ok(combined, "Pending partner requests loaded", { count: combined.length });
    }

    return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown admin resource" }, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

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
      const raw = await req.json();
      const parsed = validateBody(z.object({ verificationId: z.string().uuid(), approved: z.boolean(), notes: z.string().optional(), requestedTier: z.number().int().nonnegative().optional() }), raw);
      if (!parsed.ok) return parsed.response;
      const { verificationId, approved, notes, requestedTier } = parsed.data;
      const newStatus = approved ? "approved" : "rejected";
      const reviewerId = authResult.user.id;
      const { error } = await supabaseAdmin().from("ngo_verifications").update({ status: newStatus, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes ?? null }).eq("id", verificationId);
      if (error) return serverError(error.message);
      const { data: verification } = await supabaseAdmin().from("ngo_verifications").select("user_id, requested_tier").eq("id", verificationId).single();
      if (approved && verification) {
        const tier = requestedTier ?? verification.requested_tier ?? 3;
        await supabaseAdmin().from("users").update({ role: "ngo", identity_tier: tier }).eq("id", verification.user_id);
      }
      await audit({ tableName: "ngo_verifications", recordId: verificationId, action: "UPDATE", actorId: reviewerId, actorRole: authResult.user.role, newData: { status: newStatus } });
      return ok(null, `Verification ${newStatus}`);
    }

    if (subResource === "verifications" && pathParts[1] === "identity") {
      const raw = await req.json();
      const parsed = validateBody(z.object({ verificationId: z.string().uuid(), approved: z.boolean(), notes: z.string().optional() }), raw);
      if (!parsed.ok) return parsed.response;
      const { verificationId, approved, notes } = parsed.data;
      const newStatus = approved ? "approved" : "rejected";
      const { data, error } = await supabaseAdmin().from("identity_verifications").insert({
        user_id: verificationId, reviewed_by: authResult.user.id, status: newStatus, reviewed_at: new Date().toISOString(),
      }).select("*").single();
      if (error) return serverError(error.message);
      if (approved) {
        await supabaseAdmin().from("users").update({ identity_tier: 2 }).eq("id", verificationId);
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

    if (subResource === "partner-requests") {
      const target = pathParts[1];
      const action = pathParts[2];

      if (!target || !action) {
        const { data: clinics, error: cErr } = await supabaseAdmin().from("partner_clinics").select("*").eq("is_verified", false).order("created_at", { ascending: false });
        const { data: stores, error: sErr } = await supabaseAdmin().from("partner_stores").select("*").eq("is_verified", false).order("created_at", { ascending: false });
        if (cErr) return serverError(cErr.message);
        if (sErr) return serverError(sErr.message);
        const combined = [
          ...(clinics ?? []).map((r: any) => ({ ...r, partnerType: "clinic" as const })),
          ...(stores ?? []).map((r: any) => ({ ...r, partnerType: "store" as const })),
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
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/\/api\/v1\/admin\//, "").split("/").filter(Boolean);

  try {
    if (pathParts[0] === "cases" && pathParts.length > 1) {
      const caseId = pathParts[1];
      const raw = await req.json();
      const parsed = validateBody(z.object({ status: z.string() }).passthrough(), raw);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data as Record<string, unknown>;
      const { data, error } = await supabaseAdmin().from("cases").update(body).eq("id", caseId).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "cases", recordId: caseId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
      return ok(data, "Case updated");
    }

    if (pathParts[0] === "users" && pathParts.length > 1) {
      const userId = pathParts[1];
      const raw = await req.json();
      const parsed = validateBody(z.object({ isBanned: z.boolean().optional(), role: z.string().optional(), identityTier: z.number().int().nonnegative().optional() }).passthrough(), raw);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data as Record<string, unknown>;
      const { data, error } = await supabaseAdmin().from("users").update(body).eq("id", userId).select("*").single();
      if (error) return serverError(error.message);
      if (data) await audit({ tableName: "users", recordId: userId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
      return ok(data, "User updated");
    }

    return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown admin resource" }, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

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
