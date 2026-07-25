import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const { data, error } = await supabaseAdmin()
    .from("case_responses")
    .select("claimed_at, picked_up_at, at_hospital_at, cases(created_at)")
    .limit(500);

  if (error) return serverError(error.message);

  const rows = (data ?? []) as unknown as Array<{ claimed_at: string; picked_up_at: string | null; at_hospital_at: string | null; cases: { created_at: string } | null }>;

  const toFirstClaimMins: number[] = [];
  const toPickupMins: number[] = [];
  const toClinicMins: number[] = [];
  let within15 = 0;

  for (const row of rows) {
    if (!row.cases) continue;
    const reportedAt = new Date(row.cases.created_at).getTime();
    const claimedAt = new Date(row.claimed_at).getTime();
    const claimMins = (claimedAt - reportedAt) / 60000;
    if (Number.isFinite(claimMins) && claimMins >= 0) {
      toFirstClaimMins.push(claimMins);
      if (claimMins <= 15) within15++;
    }
    if (row.picked_up_at) {
      const mins = (new Date(row.picked_up_at).getTime() - claimedAt) / 60000;
      if (Number.isFinite(mins) && mins >= 0) toPickupMins.push(mins);
    }
    if (row.at_hospital_at) {
      const mins = (new Date(row.at_hospital_at).getTime() - claimedAt) / 60000;
      if (Number.isFinite(mins) && mins >= 0) toClinicMins.push(mins);
    }
  }

  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  return ok({
    avgMinsToFirstClaim: avg(toFirstClaimMins),
    avgMinsToPickup: avg(toPickupMins),
    avgMinsToClinic: avg(toClinicMins),
    totalCasesTracked: rows.length,
    casesRespondedWithin15Mins: within15,
  }, "Response metrics loaded");
}
