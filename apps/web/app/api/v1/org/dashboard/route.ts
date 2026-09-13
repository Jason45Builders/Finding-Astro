import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext } from "@/lib/org-auth";
import { ok, serverError } from "@/lib/api-response";
import { mapOrgDashboardStats } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const admin = supabaseAdmin();
    const gid = org.welfareGroupId;

    const { data: members } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("welfare_group_id", gid)
      .eq("is_active", true);

    const userIds = (members ?? []).map((m: any) => m.user_id);
    const hasMembers = userIds.length > 0;

    const [
      totalAnimalsRes,
      activeRescuesRes,
      adoptionReadyRes,
      medicalCasesRes,
      vaccinationsDueRes,
      pendingAdoptionsRes,
      donationsRes,
      expensesRes,
      activeVolunteersRes,
      openTasksRes,
      upcomingEventsRes,
    ] = await Promise.allSettled([
      hasMembers
        ? admin.from("animals").select("id", { count: "exact", head: true }).in("caretaker_user_id", userIds)
        : admin.from("animals").select("id", { count: "exact", head: true }).eq("caretaker_user_id", gid),
      hasMembers
        ? admin.from("cases").select("id", { count: "exact", head: true }).in("assigned_to_user_id", userIds).in("status", ["open", "in_review"])
        : admin.from("cases").select("id", { count: "exact", head: true }).eq("assigned_to_user_id", gid).in("status", ["open", "in_review"]),
      hasMembers
        ? admin.from("animals").select("id", { count: "exact", head: true }).in("caretaker_user_id", userIds).eq("status", "community").not("adoptable_since", "is", null)
        : admin.from("animals").select("id", { count: "exact", head: true }).eq("caretaker_user_id", gid).eq("status", "community").not("adoptable_since", "is", null),
      hasMembers
        ? admin.from("medical_history").select("id", { count: "exact", head: true }).in("created_by_user_id", userIds)
        : admin.from("medical_history").select("id", { count: "exact", head: true }).eq("created_by_user_id", gid),
      hasMembers
        ? admin.from("vaccinations").select("id", { count: "exact", head: true }).in("administered_by_user_id", userIds).lt("expires_at", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        : admin.from("vaccinations").select("id", { count: "exact", head: true }).eq("administered_by_user_id", gid).lt("expires_at", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
      hasMembers
        ? admin.from("adoption_applications").select("id", { count: "exact", head: true }).in("reviewed_by_user_id", userIds).eq("status", "pending_review")
        : admin.from("adoption_applications").select("id", { count: "exact", head: true }).eq("reviewed_by_user_id", gid).eq("status", "pending_review"),
      admin.from("welfare_payments").select("amount").eq("welfare_group_id", gid).eq("status", "VERIFIED").gte("payment_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]),
      admin.from("expenses").select("amount").eq("welfare_group_id", gid).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      admin.from("organization_members").select("id", { count: "exact", head: true }).eq("welfare_group_id", gid).eq("is_active", true),
      admin.from("tasks").select("id", { count: "exact", head: true }).eq("welfare_group_id", gid).neq("status", "completed"),
      admin.from("events").select("id", { count: "exact", head: true }).eq("welfare_group_id", gid).eq("status", "planned"),
    ]);

    const donationsTotal = (donationsRes.status === "fulfilled" ? donationsRes.value.data ?? [] : []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);
    const expensesTotal = (expensesRes.status === "fulfilled" ? expensesRes.value.data ?? [] : []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);

    const stats = {
      total_animals: totalAnimalsRes.status === "fulfilled" ? totalAnimalsRes.value.count ?? 0 : 0,
      active_rescues: activeRescuesRes.status === "fulfilled" ? activeRescuesRes.value.count ?? 0 : 0,
      adoption_ready: adoptionReadyRes.status === "fulfilled" ? adoptionReadyRes.value.count ?? 0 : 0,
      medical_cases: medicalCasesRes.status === "fulfilled" ? medicalCasesRes.value.count ?? 0 : 0,
      vaccinations_due: vaccinationsDueRes.status === "fulfilled" ? vaccinationsDueRes.value.count ?? 0 : 0,
      pending_adoptions: pendingAdoptionsRes.status === "fulfilled" ? pendingAdoptionsRes.value.count ?? 0 : 0,
      donations_this_month: donationsTotal,
      expenses_this_month: expensesTotal,
      active_volunteers: activeVolunteersRes.status === "fulfilled" ? activeVolunteersRes.value.count ?? 0 : 0,
      open_tasks: openTasksRes.status === "fulfilled" ? openTasksRes.value.count ?? 0 : 0,
      upcoming_events: upcomingEventsRes.status === "fulfilled" ? upcomingEventsRes.value.count ?? 0 : 0,
    };

    return ok(mapOrgDashboardStats(stats), "Dashboard stats loaded");
  } catch {
    return serverError();
  }
}