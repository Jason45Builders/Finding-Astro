import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext } from "@/lib/org-auth";
import { ok, serverError } from "@/lib/api-response";
import { mapAnimal } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;
  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    let query = supabaseAdmin().from("animals").select("*").eq("welfare_group_id", org.welfareGroupId).order("updated_at", { ascending: false }).limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapAnimal), "Animals loaded");
  } catch {
    return serverError();
  }
}
