import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, notFound, badRequest, forbidden } from "@/lib/api-response";
import { mapTask } from "@/lib/types";

const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Task not found");
    return ok(mapTask(data), "Task loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "tasks:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Task not found");

    const allowed: Record<string, unknown> = {};
    if (body.title !== undefined) allowed.title = String(body.title).trim();
    if (body.description !== undefined) allowed.description = body.description ?? null;
    if (body.assigneeUserId !== undefined) allowed.assignee_user_id = body.assigneeUserId ?? null;
    if (body.caseId !== undefined) allowed.case_id = body.caseId ?? null;
    if (body.animalId !== undefined) allowed.animal_id = body.animalId ?? null;
    if (body.dueDate !== undefined) allowed.due_date = body.dueDate ?? null;
    if (body.priority && TASK_PRIORITIES.includes(body.priority)) allowed.priority = body.priority;
    if (body.status && TASK_STATUSES.includes(body.status)) allowed.status = body.status;

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("tasks")
      .update(allowed)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapTask(data), "Task updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "tasks:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const { error } = await supabaseAdmin()
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId);

    if (error) return serverError(error.message);
    return ok(null, "Task deleted");
  } catch {
    return serverError();
  }
}