import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, notFound, badRequest, forbidden } from "@/lib/api-response";
import { mapExpense } from "@/lib/types";

const EXPENSE_CATEGORIES = ["veterinary", "medicine", "food", "transport", "shelter", "utilities", "supplies", "abc", "adoption", "other"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("expenses")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return notFound("Expense not found");
    return ok(mapExpense(data), "Expense loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "expenses:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const { data: existing, error: fetchError } = await supabaseAdmin()
      .from("expenses")
      .select("*")
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Expense not found");

    const allowed: Record<string, unknown> = {};
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!amt || amt <= 0) return badRequest("INVALID_BODY", "Amount must be positive");
      allowed.amount = amt;
    }
    if (body.category && EXPENSE_CATEGORIES.includes(body.category)) allowed.category = body.category;
    if (body.vendor !== undefined) allowed.vendor = body.vendor ?? null;
    if (body.description !== undefined) allowed.description = body.description ?? null;
    if (body.receiptUrl !== undefined) allowed.receipt_url = body.receiptUrl ?? null;
    if (body.reimbursable !== undefined) allowed.reimbursable = body.reimbursable;
    if (body.approved !== undefined) {
      if (body.approved && !hasOrgPermission(org.permissions, "expenses:approve")) {
        return forbidden("Insufficient permissions to approve expenses");
      }
      allowed.approved = body.approved;
    }
    if (body.approved && body.reimbursedAt) allowed.reimbursed_at = body.reimbursedAt;

    if (Object.keys(allowed).length === 0) return badRequest("NO_CHANGES", "No updatable fields provided");

    const { data, error } = await supabaseAdmin()
      .from("expenses")
      .update(allowed)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapExpense(data), "Expense updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { id } = await params;

  if (!hasOrgPermission(org.permissions, "expenses:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const { error } = await supabaseAdmin()
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("welfare_group_id", org.welfareGroupId);

    if (error) return serverError(error.message);
    return ok(null, "Expense deleted");
  } catch {
    return serverError();
  }
}