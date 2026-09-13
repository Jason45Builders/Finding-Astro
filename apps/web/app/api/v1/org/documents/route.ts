import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext } from "@/lib/org-auth";
import { ok, serverError, badRequest } from "@/lib/api-response";
import { mapOrganizationDocument } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const { data, error } = await supabaseAdmin()
      .from("organization_documents")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapOrganizationDocument), "Documents loaded");
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;
  const userId = (authResult as { user: { id: string } }).user.id;

  try {
    const body = await req.json();
    const documentType = String(body.documentType ?? "").trim();
    const url = String(body.url ?? "").trim();
    if (!documentType || !url) return badRequest("INVALID_BODY", "documentType and url are required");

    const { data, error } = await supabaseAdmin()
      .from("organization_documents")
      .insert({
        welfare_group_id: org.welfareGroupId,
        document_type: documentType,
        url,
        expiry_date: body.expiryDate ?? null,
        verified: false,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapOrganizationDocument(data), "Document added");
  } catch {
    return serverError();
  }
}