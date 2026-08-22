import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { mapWelfarePayment } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = supabaseAdmin()
      .from("welfare_payments")
      .select("*")
      .eq("donor_id", authResult.user.id)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
    const { data, error } = await query.limit(limit);

    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapWelfarePayment), "My donations loaded", { count: data?.length ?? 0 });
  } catch {
    return serverError();
  }
}
