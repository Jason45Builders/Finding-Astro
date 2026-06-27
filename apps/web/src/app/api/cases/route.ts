import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Case as CaseType } from "@/lib/types";
import type { Profile } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase.from("cases").select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    const cases: CaseType[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      animalId: row.animal_id as string | null,
      reporterUserId: row.reporter_user_id as string,
      assignedToUserId: row.assigned_to_user_id as string | null,
      caseType: row.case_type as CaseType["caseType"],
      status: row.status as CaseType["status"],
      priority: (row.priority as CaseType["priority"]) ?? "medium",
      title: row.title as string,
      description: row.description as string,
      locationText: row.location_text as string | null,
      evidenceUrls: (row.evidence_urls as string[]) ?? [],
      resolutionNotes: row.resolution_notes as string | null,
      assignmentScore: row.assignment_score as number | null,
      assignmentReason: row.assignment_reason as string | null,
      wildlifeSpeciesCategory: row.wildlife_species_category as string | null,
      wildlifeCondition: row.wildlife_condition as string | null,
      publicGuidanceShown: (row.public_guidance_shown as boolean) ?? false,
      guestPhone: row.guest_phone as string | null,
      heldForReview: (row.held_for_review as boolean) ?? false,
      ngoVerified: (row.ngo_verified as boolean) ?? false,
      ngoVerifiedBy: row.ngo_verified_by as string | null,
      ngoVerifiedAt: row.ngo_verified_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      location: (row.location as { latitude: number; longitude: number }) ?? { latitude: 0, longitude: 0 },
    }));

    return NextResponse.json({ success: true, data: cases });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase.from("cases").insert({
      case_type: body.caseType,
      title: body.title,
      description: body.description,
      location: body.location ? `POINT(${body.location.longitude} ${body.location.latitude})` : null,
      location_text: body.location_text ?? null,
      evidence_urls: body.evidenceUrls ?? [],
      priority: body.priority ?? "medium",
      animal_id: body.animalId ?? null,
      reporter_user_id: body.reporterUserId ?? null,
      status: "open",
    }).select("*").single();

    if (error) throw error;

    const c: CaseType = {
      id: data.id as string,
      animalId: data.animal_id as string | null,
      reporterUserId: data.reporter_user_id as string,
      assignedToUserId: data.assigned_to_user_id as string | null,
      caseType: data.case_type as CaseType["caseType"],
      status: data.status as CaseType["status"],
      priority: (data.priority as CaseType["priority"]) ?? "medium",
      title: data.title as string,
      description: data.description as string,
      locationText: data.location_text as string | null,
      evidenceUrls: (data.evidence_urls as string[]) ?? [],
      resolutionNotes: data.resolution_notes as string | null,
      assignmentScore: data.assignment_score as number | null,
      assignmentReason: data.assignment_reason as string | null,
      wildlifeSpeciesCategory: data.wildlife_species_category as string | null,
      wildlifeCondition: data.wildlife_condition as string | null,
      publicGuidanceShown: (data.public_guidance_shown as boolean) ?? false,
      guestPhone: data.guest_phone as string | null,
      heldForReview: (data.held_for_review as boolean) ?? false,
      ngoVerified: (data.ngo_verified as boolean) ?? false,
      ngoVerifiedBy: data.ngo_verified_by as string | null,
      ngoVerifiedAt: data.ngo_verified_at as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      location: (data.location as { latitude: number; longitude: number }) ?? { latitude: 0, longitude: 0 },
    };

    return NextResponse.json({ success: true, data: c });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
