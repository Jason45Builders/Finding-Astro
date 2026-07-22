import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const name = url.pathname.replace(/\/api\/v1\/wildlife\/guidance\/?/, "");
    if (!name) return new Response(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Species name required" }), { status: 404, headers: { "Content-Type": "application/json" } });
    const { data, error } = await supabaseAdmin().from("wildlife_species_categories").select("*").eq("name", name).maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return new Response(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Species not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return ok(data, "Guidance loaded");
  } catch {
    return serverError();
  }
}
