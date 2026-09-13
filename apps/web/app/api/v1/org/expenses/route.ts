import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapExpense } from "@/lib/types";

const EXPENSE_CATEGORIES = ["veterinary", "medicine", "food", "transport", "shelter", "utilities", "supplies", "abc", "adoption", "other"] as const;

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const approved = url.searchParams.get("approved");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);

    let query = supabaseAdmin()
      .from("expenses")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category && EXPENSE_CATEGORIES.includes(category as any)) query = query.eq("category", category);
    if (approved === "true") query = query.eq("approved", true);
    if (approved === "false") query = query.eq("approved", false);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapExpense), "Expenses loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "expenses:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return badRequest("INVALID_BODY", "Valid amount is required");

    const category = body.category && EXPENSE_CATEGORIES.includes(body.category) ? body.category : "other";

    const { data, error } = await supabaseAdmin()
      .from("expenses")
      .insert({
        welfare_group_id: org.welfareGroupId,
        case_id: body.caseId ?? null,
        animal_id: body.animalId ?? null,
        amount,
        currency: body.currency ?? "INR",
        category,
        vendor: body.vendor ?? null,
        description: body.description ?? null,
        receipt_url: body.receiptUrl ?? null,
        paid_by: userId,
        reimbursable: body.reimbursable ?? false,
        approved: false,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapExpense(data), "Expense recorded");
  } catch {
    return serverError();
  }
}