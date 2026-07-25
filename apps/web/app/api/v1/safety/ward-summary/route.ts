import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { mapWardSummary } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const ward = url.searchParams.get("ward");
    let query = supabaseAdmin().from("wards").select("*");
    if (ward) query = query.eq("name", ward);
    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapWardSummary), "Ward summary loaded");
  } catch {
    return serverError();
  }
}
