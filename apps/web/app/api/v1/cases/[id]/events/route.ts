import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const id = url.pathname.replace(/\/api\/v1\/cases\//, "").replace(/\/events\/?$/, "");
  if (!id) return badRequest("VALIDATION_ERROR", "case id required");

  const { data, error } = await supabaseAdmin()
    .from("case_events")
    .select("*")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Case events loaded");
}
