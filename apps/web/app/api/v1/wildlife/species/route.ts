import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { data, error } = await supabaseAdmin().from("wildlife_species_categories").select("*").eq("is_active", true);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Wildlife species loaded");
  } catch {
    return serverError();
  }
}
