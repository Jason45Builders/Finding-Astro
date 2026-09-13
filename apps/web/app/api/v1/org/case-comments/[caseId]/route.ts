import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapCaseComment } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { caseId } = await params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("case_comments")
      .select("*")
      .eq("case_id", caseId)
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: true });

    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapCaseComment), "Comments loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const { caseId } = await params;
  const userId = (authResult as { user: { id: string } }).user.id;

  if (!hasOrgPermission(org.permissions, "cases:write")) {
    return forbidden("Insufficient permissions");
  }

  try {
    const body = await req.json();
    const message = String(body.message ?? "").trim();
    if (!message) return badRequest("INVALID_BODY", "Message is required");

    const { data: user } = await supabaseAdmin()
      .from("users")
      .select("full_name, role")
      .eq("id", userId)
      .single();

    const { data, error } = await supabaseAdmin()
      .from("case_comments")
      .insert({
        case_id: caseId,
        welfare_group_id: org.welfareGroupId,
        actor_user_id: userId,
        actor_name: (user as any)?.full_name ?? "Unknown",
        actor_role: (user as any)?.role ?? null,
        message,
        attachment_url: body.attachmentUrl ?? null,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapCaseComment(data), "Comment added");
  } catch {
    return serverError();
  }
}