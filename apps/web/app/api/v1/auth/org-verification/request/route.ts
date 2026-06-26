import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { orgName, registrationNumber, orgType, address } = body as Record<string, string>;
    if (!orgName) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "Organisation name required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    await supabaseAdmin.from("ngo_verifications").insert({
      user_id: authResult.user.id,
      org_name: orgName,
      registration_number: registrationNumber ?? null,
      org_type: orgType ?? "ngo",
      address: address ?? null,
      status: "pending",
      requested_at: new Date().toISOString(),
    });

    return ok(null, "Verification request submitted");
  } catch {
    return serverError("Failed to submit verification request");
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const { data, error } = await supabaseAdmin
    .from("ngo_verifications")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Pending verifications loaded");
}
