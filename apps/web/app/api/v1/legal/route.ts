import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const ReportVerdictSchema = z.object({
  userId: z.string().uuid().optional(),
  caseId: z.string().uuid(),
  actionTaken: z.string().min(1),
  notes: z.string().optional(),
});

const VERDICT_MAP: Record<string, string> = {
  confirmed_genuine: "confirmed_genuine",
  genuine: "confirmed_genuine",
  valid: "confirmed_genuine",
  false_report: "false_report",
  rejected: "false_report",
  fake: "false_report",
  malicious: "malicious",
  harassment: "malicious",
  duplicate: "duplicate",
  already_handled: "duplicate",
  unverifiable: "unverifiable",
  insufficient_evidence: "unverifiable",
};

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(ReportVerdictSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { userId, caseId, actionTaken, notes } = parsed.data;
    if (!caseId) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "caseId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const verdict = VERDICT_MAP[actionTaken] ?? null;
    if (!verdict) {
      return new Response(JSON.stringify({ success: false, code: "INVALID_ACTION_TAKEN", message: `Unrecognized actionTaken value: ${actionTaken}` }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data, error } = await supabaseAdmin().from("report_verdicts").insert({
      case_id: caseId,
      reporter_user_id: userId ?? authResult.user.id,
      verdict,
      verdict_by: authResult.user.id,
      verdict_by_role: authResult.user.role,
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "report_verdicts", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(data, "Verdict recorded");
  } catch {
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
      const { data, error } = await supabaseAdmin().from("legal_aid_providers").select("*").limit(50);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Legal aid providers loaded");
  } catch {
    return serverError();
  }
}
