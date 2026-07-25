import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const caseId = url.pathname.replace(/.*cases\//, "").replace(/\/close.*$/, "");
    if (!caseId) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "caseId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { data, error } = await supabaseAdmin().from("cases").update({
      status: "closed",
      updated_at: new Date().toISOString(),
    }).eq("id", caseId).eq("case_type", "wildlife").select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "cases", recordId: caseId, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(null, "Wildlife case closed");
  } catch {
    return serverError();
  }
}
