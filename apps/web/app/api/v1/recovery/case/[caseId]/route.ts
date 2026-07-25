import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const caseId = url.pathname.replace(/\/api\/v1\/recovery\/case\//, "").replace(/\/.*$/, "");
  if (!caseId) return badRequest("VALIDATION_ERROR", "case id required");

  const { data, error } = await supabaseAdmin()
    .from("recovery_funding")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Recovery records loaded");
}
