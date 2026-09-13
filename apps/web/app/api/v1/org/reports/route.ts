import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapImpactReport } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const reportType = url.searchParams.get("reportType");

    let query = supabaseAdmin()
      .from("impact_reports")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("period_end", { ascending: false });

    if (reportType) query = query.eq("report_type", reportType);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapImpactReport), "Reports loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "reports:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const reportType = String(body.reportType ?? "").trim();
    if (!reportType) return badRequest("INVALID_BODY", "reportType is required");

    const periodStart = body.periodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const periodEnd = body.periodEnd ?? new Date().toISOString().split("T")[0];

    const { data: members } = await supabaseAdmin()
      .from("organization_members")
      .select("user_id")
      .eq("welfare_group_id", org.welfareGroupId)
      .eq("is_active", true);

    const userIds = (members ?? []).map((m: any) => m.user_id);
    const hasMembers = userIds.length > 0;

    const [
      rescuesRes,
      animalsRes,
      sterilizationsRes,
      vaccinationsRes,
      adoptionsRes,
      expensesRes,
      donationsRes,
    ] = await Promise.all([
      hasMembers
        ? supabaseAdmin().from("cases").select("id", { count: "exact", head: true }).in("assigned_to_user_id", userIds)
        : supabaseAdmin().from("cases").select("id", { count: "exact", head: true }).eq("assigned_to_user_id", org.welfareGroupId),
      hasMembers
        ? supabaseAdmin().from("animals").select("id", { count: "exact", head: true }).in("caretaker_user_id", userIds)
        : supabaseAdmin().from("animals").select("id", { count: "exact", head: true }).eq("caretaker_user_id", org.welfareGroupId),
      hasMembers
        ? supabaseAdmin().from("animals").select("id", { count: "exact", head: true }).in("caretaker_user_id", userIds).eq("is_sterilized", true)
        : supabaseAdmin().from("animals").select("id", { count: "exact", head: true }).eq("caretaker_user_id", org.welfareGroupId).eq("is_sterilized", true),
      hasMembers
        ? supabaseAdmin().from("vaccinations").select("id", { count: "exact", head: true }).in("administered_by_user_id", userIds)
        : supabaseAdmin().from("vaccinations").select("id", { count: "exact", head: true }).eq("administered_by_user_id", org.welfareGroupId),
      hasMembers
        ? supabaseAdmin().from("adoption_applications").select("id", { count: "exact", head: true }).in("reviewed_by_user_id", userIds).eq("status", "adopted")
        : supabaseAdmin().from("adoption_applications").select("id", { count: "exact", head: true }).eq("reviewed_by_user_id", org.welfareGroupId).eq("status", "adopted"),
      supabaseAdmin().from("expenses").select("amount").eq("welfare_group_id", org.welfareGroupId).gte("created_at", periodStart).lte("created_at", periodEnd),
      supabaseAdmin().from("welfare_payments").select("amount").eq("welfare_group_id", org.welfareGroupId).eq("status", "VERIFIED").gte("payment_date", periodStart).lte("payment_date", periodEnd),
    ]);

    const expensesTotal = (expensesRes.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);
    const donationsTotal = (donationsRes.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);

    const reportData = {
      rescues: rescuesRes.count ?? 0,
      animalsInCare: animalsRes.count ?? 0,
      sterilizations: sterilizationsRes.count ?? 0,
      vaccinations: vaccinationsRes.count ?? 0,
      adoptions: adoptionsRes.count ?? 0,
      expenses: expensesTotal,
      donations: donationsTotal,
      periodStart,
      periodEnd,
    };

    const { data, error } = await supabaseAdmin()
      .from("impact_reports")
      .insert({
        welfare_group_id: org.welfareGroupId,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        data: reportData,
        generated_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapImpactReport(data), "Impact report generated");
  } catch {
    return serverError();
  }
}