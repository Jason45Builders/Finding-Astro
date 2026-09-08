import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";

export type CaseResponderResponse = {
  id: string;
  caseId: string;
  responderUserId: string;
  responderName: string | null;
  status: string;
  notes: string | null;
  onScenePhotoUrls: string[];
  pickedUpPhotoUrls: string[];
  atHospitalPhotoUrls: string[];
  completedPhotoUrls: string[];
  createdAt: string;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    if (!id) return badRequest("VALIDATION_ERROR", "case id required");

    const { data, error } = await supabaseAdmin()
      .from("case_responses")
      .select("*, users(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: true });

    if (error) return serverError(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const responses: CaseResponderResponse[] = rows.map((row) => ({
      id: row.id as string,
      caseId: row.case_id as string,
      responderUserId: row.responder_user_id as string,
      responderName: (row.users as { full_name?: string | null } | null)?.full_name ?? null,
      status: row.status as string,
      notes: row.notes as string | null,
      onScenePhotoUrls: (row.on_scene_photo_urls as string[]) ?? [],
      pickedUpPhotoUrls: (row.picked_up_photo_urls as string[]) ?? [],
      atHospitalPhotoUrls: (row.at_hospital_photo_urls as string[]) ?? [],
      completedPhotoUrls: (row.completed_photo_urls as string[]) ?? [],
      createdAt: row.created_at as string,
    }));

    return ok(responses, "Case responses loaded");
  } catch {
    return serverError();
  }
}
