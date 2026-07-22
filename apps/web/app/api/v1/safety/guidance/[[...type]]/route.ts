import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const raw = url.pathname.replace(/\/api\/v1\/safety\/guidance\/?/, "");
    const type = raw || null;
    let query = supabaseAdmin().from("behaviour_guidance_cards").select("*").eq("is_active", true);
    if (type) query = query.eq("situation_type", type);
    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok(data ?? [], "Guidance loaded");
  } catch {
    return serverError();
  }
}
