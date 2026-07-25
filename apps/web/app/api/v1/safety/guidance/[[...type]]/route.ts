import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";
import { mapBehaviourGuidanceCard } from "@/lib/types";

// Public, unauthenticated on purpose: this is static safety reference content
// with no user-specific data, and someone in an unsafe situation right now
// must not be blocked from seeing it just because they haven't signed in.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const raw = url.pathname.replace(/\/api\/v1\/safety\/guidance\/?/, "");
    const type = raw || null;
    let query = supabaseAdmin().from("behaviour_guidance_cards").select("*").eq("is_active", true).order("display_order", { ascending: true });
    if (type) query = query.eq("situation_type", type);
    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapBehaviourGuidanceCard), "Guidance loaded");
  } catch {
    return serverError();
  }
}
