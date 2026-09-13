import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapTask } from "@/lib/types";

const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const assignee = url.searchParams.get("assignee");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    let query = supabaseAdmin()
      .from("tasks")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("due_date", { ascending: true })
      .limit(limit);

    if (status && TASK_STATUSES.includes(status as any)) query = query.eq("status", status);
    if (assignee) query = query.eq("assignee_user_id", assignee);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapTask), "Tasks loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "tasks:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    if (!title) return badRequest("INVALID_BODY", "Title is required");

    const priority = body.priority && TASK_PRIORITIES.includes(body.priority) ? body.priority : "medium";
    const status = body.status && TASK_STATUSES.includes(body.status) ? body.status : "pending";

    const { data, error } = await supabaseAdmin()
      .from("tasks")
      .insert({
        welfare_group_id: org.welfareGroupId,
        title,
        description: body.description ?? null,
        assignee_user_id: body.assigneeUserId ?? null,
        case_id: body.caseId ?? null,
        animal_id: body.animalId ?? null,
        due_date: body.dueDate ?? null,
        priority,
        status,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapTask(data), "Task created");
  } catch {
    return serverError();
  }
}