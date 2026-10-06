import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireOrg, OrgContext, hasOrgPermission } from "@/lib/org-auth";
import { ok, serverError, badRequest, forbidden } from "@/lib/api-response";
import { mapAnimalDocument } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await requireOrg(req);
  if (authResult instanceof Response) return authResult;

  const org = (authResult as { org: OrgContext }).org;

  try {
    const url = new URL(req.url);
    const animalId = url.searchParams.get("animalId");

    let query = supabaseAdmin()
      .from("animal_documents")
      .select("*")
      .eq("welfare_group_id", org.welfareGroupId)
      .order("created_at", { ascending: false });

    if (animalId) query = query.eq("animal_id", animalId);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok((data ?? []).map(mapAnimalDocument), "Documents loaded");
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
    const animalId = String(body.animalId ?? "").trim();
    const documentType = String(body.documentType ?? "").trim();
    const url = String(body.url ?? "").trim();
    if (!animalId || !documentType || !url) return badRequest("INVALID_BODY", "animalId, documentType, and url are required");

    const { data: animal, error: animalError } = await supabaseAdmin()
      .from("animals")
      .select("id")
      .eq("id", animalId)
      .eq("welfare_group_id", org.welfareGroupId)
      .maybeSingle();
    if (animalError) return serverError(animalError.message);
    if (!animal) return badRequest("INVALID_ANIMAL", "Animal not found in this organization");
    if (!hasOrgPermission(org.permissions, "animals:write")) {
      return forbidden("Insufficient permissions");
    }

    const { data, error } = await supabaseAdmin()
      .from("animal_documents")
      .insert({
        animal_id: animalId,
        welfare_group_id: org.welfareGroupId,
        document_type: documentType,
        url,
        notes: body.notes ?? null,
        uploaded_by: userId,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    return ok(mapAnimalDocument(data), "Document added");
  } catch {
    return serverError();
  }
}