import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, forbidden } from "@/lib/api-response";
import { mapWelfarePayment } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const isAdmin = ["admin", "govt"].includes(authResult.user.role);
    const isOrgAdmin = await isWelfareOrgAdmin(id, authResult.user.id);
    const isDonor = false;

    if (!isAdmin && !isOrgAdmin) return forbidden("Insufficient permissions");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const purpose = url.searchParams.get("purpose");

    let query = supabaseAdmin()
      .from("welfare_payments")
      .select("*")
      .eq("welfare_group_id", id)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (purpose) query = query.eq("purpose", purpose);

    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
    const { data, error } = await query.limit(limit);

    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapWelfarePayment), "Donations loaded", { count: data?.length ?? 0 });
  } catch {
    return serverError();
  }
}

async function isWelfareOrgAdmin(welfareGroupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("welfare_org_admins")
    .select("id")
    .eq("welfare_group_id", welfareGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data && !error;
}
