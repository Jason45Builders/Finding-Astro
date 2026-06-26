import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound, forbidden } from "@/lib/api-response";

const PRIVILEGED_ROLES = ["ngo", "govt", "admin"];

function checkPrivileged(user: { role: string }) {
  if (!PRIVILEGED_ROLES.includes(user.role)) return forbidden("Insufficient permissions");
  return null;
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
    const subResource = pathParts[1];

    if (subResource === "responders") {
      const { data, error } = await supabaseAdmin.from("users").select("*").eq("role", "ngo").order("reputation_score", { ascending: false });
      if (error) return serverError(error.message);
      return ok(data ?? [], "Responders loaded");
    }

    if (subResource === "wards") {
      const { data, error } = await supabaseAdmin.from("wards").select("*");
      if (error) return serverError(error.message);
      return ok(data ?? [], "Wards loaded");
    }

    if (subResource === "users") {
      const { data, error } = await supabaseAdmin.from("users").select("id, email, full_name, role, is_banned, identity_tier, created_at").limit(parseInt(url.searchParams.get("limit") ?? "100", 10));
      if (error) return serverError(error.message);
      return ok(data ?? [], "Users loaded", { count: data?.length ?? 0 });
    }

    if (subResource === "funding") {
      const { data, error } = await supabaseAdmin.from("funding_cases").select("*").order("created_at", { ascending: false }).limit(parseInt(url.searchParams.get("limit") ?? "50", 10));
      if (error) return serverError(error.message);
      return ok(data ?? [], "Funding loaded");
    }

    if (subResource === "partners") {
      const { data, error } = await supabaseAdmin.from("partners").select("*");
      if (error) return serverError(error.message);
      return ok(data ?? [], "Partners loaded");
    }

    if (subResource === "content") {
      const contentType = pathParts[2];
      const { data, error } = await supabaseAdmin.from(`${contentType}_content`).select("*").limit(200);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Content loaded");
    }

    if (subResource === "dashboard") {
      const dashboardType = pathParts[2];
      if (dashboardType === "alerts") {
        const { data, error } = await supabaseAdmin.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
        if (error) return serverError(error.message);
        return ok(data ?? [], "Alerts loaded");
      }
      if (dashboardType === "monthly-cases") {
        const { data, error } = await supabaseAdmin.from("cases").select("status, created_at");
        if (error) return serverError(error.message);
        return ok(data ?? [], "Monthly stats loaded");
      }
    }

    return notFound();
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
    const subResource = pathParts[1];

    if (subResource === "cases" && pathParts[3] === "assign") {
      const caseId = pathParts[2];
      const { responderId } = await req.json() as { responderId: string };
      const { data, error } = await supabaseAdmin.from("cases").update({ assigned_to_user_id: responderId, status: "in_review" }).eq("id", caseId).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Case assigned");
    }

    if (subResource === "partners" && pathParts[3] === "verify") {
      const partnerId = pathParts[2];
      const { status } = await req.json() as { status: string };
      const { data, error } = await supabaseAdmin.from("partners").update({ verification_status: status, verified_by_user_id: authResult.user.id }).eq("id", partnerId).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, `Partner ${status}`);
    }

    if (subResource === "users" && pathParts[3] === "ban") {
      const userId = pathParts[2];
      const { ban } = await req.json() as { ban: boolean };
      const { data, error } = await supabaseAdmin.from("users").update({ is_banned: ban }).eq("id", userId).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, ban ? "User banned" : "User unbanned");
    }

    if (subResource === "users" && pathParts[3] === "role") {
      const userId = pathParts[2];
      const { role } = await req.json() as { role: string };
      const validRoles = ["citizen", "ngo", "govt", "admin", "hospital"];
      if (!validRoles.includes(role)) return badRequest("VALIDATION_ERROR", "Invalid role");
      const { data, error } = await supabaseAdmin.from("users").update({ role }).eq("id", userId).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Role updated");
    }

    if (subResource === "users" && pathParts[3] === "verify-identity") {
      const userId = pathParts[2];
      const { verified } = await req.json() as { verified: boolean };
      const { data, error } = await supabaseAdmin.from("identity_verifications").insert({
        user_id: userId, verified_by_user_id: authResult.user.id, verified, verified_at: new Date().toISOString(),
      }).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Identity verification processed");
    }

    if (subResource === "content") {
      const contentType = pathParts[2];
      const body = await req.json();
      const { data, error } = await supabaseAdmin.from(`${contentType}_content`).insert(body).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Content created");
    }

    // Payout release
    if (subResource === "funding" && pathParts[3] === "release-payout") {
      const fundingCaseId = pathParts[2];
      const { data, error } = await supabaseAdmin.from("payouts").insert({ funding_case_id: fundingCaseId, status: "RELEASED", created_at: new Date().toISOString() }).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Payout released");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");
    const subResource = pathParts[1];

    if (subResource === "content" && pathParts.length > 3) {
      const contentType = pathParts[2];
      const contentId = pathParts[3];
      const body = await req.json();
      const { data, error } = await supabaseAdmin.from(`${contentType}_content`).update(body).eq("id", contentId).select("*").single();
      if (error) return serverError(error.message);
      return ok(data, "Content updated");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const denied = checkPrivileged(authResult.user);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");

    if (pathParts[1] === "content" && pathParts.length > 3) {
      const contentType = pathParts[2];
      const contentId = pathParts[3];
      const { error } = await supabaseAdmin.from(`${contentType}_content`).delete().eq("id", contentId);
      if (error) return serverError(error.message);
      return ok(null, "Content deleted");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
