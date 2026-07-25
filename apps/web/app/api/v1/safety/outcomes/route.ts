import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

function mapPublicOutcome(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    caseId: row.case_id as string | null,
    animalId: row.animal_id as string | null,
    outcomeType: row.outcome_type as string,
    headline: row.headline as string,
    detail: row.detail as string | null,
    locationText: row.location_text as string | null,
    wardName: row.ward_name as string | null,
    isPublic: (row.is_public as boolean) ?? true,
    occurredAt: row.occurred_at as string,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const ward = url.searchParams.get("ward");
    let query = supabaseAdmin().from("public_outcomes").select("*").eq("is_public", true);
    if (ward) query = query.eq("ward_name", ward);
    const { data, error } = await query.order("occurred_at", { ascending: false }).limit(50);
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapPublicOutcome), "Outcomes loaded");
  } catch {
    return serverError();
  }
}
