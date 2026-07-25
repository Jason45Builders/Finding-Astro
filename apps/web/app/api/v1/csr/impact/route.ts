import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const [sponsorsRes, wardsRes, txRes] = await Promise.all([
    supabaseAdmin().from("csr_sponsors").select("*"),
    supabaseAdmin().from("csr_ward_sponsorships").select("ward_name").eq("is_active", true),
    supabaseAdmin().from("csr_transactions").select("case_id"),
  ]);

  if (sponsorsRes.error) return serverError(sponsorsRes.error.message);
  if (wardsRes.error) return serverError(wardsRes.error.message);
  if (txRes.error) return serverError(txRes.error.message);

  const sponsors = sponsorsRes.data ?? [];
  const totalCommittedInr = sponsors.reduce((sum, s) => sum + Number(s.committed_amount_inr ?? 0), 0);
  const totalDisbursedInr = sponsors.reduce((sum, s) => sum + Number(s.disbursed_amount_inr ?? 0), 0);
  const activeSponsorCount = sponsors.filter((s) => s.is_active).length;
  const wardsCovered = new Set((wardsRes.data ?? []).map((w) => w.ward_name)).size;
  const casesSupported = new Set((txRes.data ?? []).map((t) => t.case_id).filter(Boolean)).size;

  return ok({
    totalCommittedInr,
    totalDisbursedInr,
    activeSponsorCount,
    wardsCovered,
    casesSupported,
    sponsors: sponsors.map((s) => ({
      id: s.id,
      orgName: s.org_name,
      commitmentType: s.commitment_type,
      committedAmountInr: Number(s.committed_amount_inr ?? 0),
      disbursedAmountInr: Number(s.disbursed_amount_inr ?? 0),
      isActive: s.is_active,
    })),
  }, "CSR impact report loaded");
}
