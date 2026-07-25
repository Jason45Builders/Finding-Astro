import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { mapTransportSlab } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const { data, error } = await supabaseAdmin()
    .from("transport_slabs")
    .select("*")
    .eq("is_active", true)
    .order("amount_inr", { ascending: true });

  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapTransportSlab), "Transport slabs loaded");
}
