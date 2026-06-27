import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Animal } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("animals").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const animals: Animal[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string | null,
      species: row.species as string,
      breed: row.breed as string | null,
      color: row.color as string | null,
      gender: row.gender as string | null,
      approxAgeMonths: row.approx_age_months as number | null,
      size: row.size as string | null,
      temperament: row.temperament as string | null,
      distinguishingMarks: row.distinguishing_marks as string | null,
      description: row.description as string | null,
      status: row.status as Animal["status"],
      primaryPhotoUrl: row.primary_photo_url as string | null,
      photoUrls: (row.photo_urls as string[]) ?? [],
      isSterilized: (row.is_sterilized as boolean) ?? false,
      lastSeenText: row.last_seen_text as string | null,
      location: (row.location as { latitude: number; longitude: number }) ?? { latitude: 0, longitude: 0 },
      territoryLabel: row.territory_label as string | null,
      visualSignature: row.visual_signature,
      lastSeenAt: row.last_seen_at as string | null,
      lastConfirmedAliveAt: row.last_confirmed_alive_at as string | null,
      seenTodayCount: (row.seen_today_count as number) ?? 0,
      disappearanceRiskLevel: (row.disappearance_risk_level as string) ?? "stable",
      vaccinationStatus: row.vaccination_status as string | null,
      caretakerUserId: row.caretaker_user_id as string | null,
      createdByUserId: row.created_by_user_id as string | null,
      adoptableSince: row.adoptable_since as string | null,
      adoptionNotes: row.adoption_notes as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    return NextResponse.json({ success: true, data: animals });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
