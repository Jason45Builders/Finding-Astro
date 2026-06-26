import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { userId, caseId, actionTaken, notes } = body as Record<string, unknown>;
    if (!caseId) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "caseId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { data, error } = await supabaseAdmin.from("case_verdicts").insert({
      case_id: caseId, user_id: userId ?? authResult.user.id, action_taken: actionTaken ?? "",
      notes: notes ?? null, created_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(data, "Verdict recorded");
  } catch {
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { data, error } = await supabaseAdmin.from("legal_docs").select("*").limit(50);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Legal docs loaded");
  } catch {
    return serverError();
  }
}
