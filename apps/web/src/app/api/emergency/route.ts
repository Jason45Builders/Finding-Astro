import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Case as CaseType } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase.from("cases").insert({
      case_type: body.case_type ?? "rescue",
      title: `Emergency: ${body.description?.slice(0, 50)}`,
      description: body.description,
      location: body.location ? `POINT(${body.location.longitude} ${body.location.latitude})` : null,
      location_text: body.location_text ?? null,
      evidence_urls: body.photo_url ? [body.photo_url] : [],
      priority: body.severity === "critical" ? "high" : "medium",
      reporter_user_id: null,
      guest_phone: body.guest_phone ?? null,
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
