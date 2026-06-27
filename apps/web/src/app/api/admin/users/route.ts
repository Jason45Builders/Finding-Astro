import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });

    if (error) throw error;

    const users: Profile[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      email: (row.email as string | null) ?? undefined,
      fullName: row.full_name as string | null,
      role: row.role as Profile["role"],
      reputationScore: (row.reputation_score as number) ?? 50,
      reportCredibilityScore: (row.report_credibility_score as number) ?? 100,
      isBanned: (row.is_banned as boolean) ?? false,
      activeCaseLimit: (row.active_case_limit as number) ?? 3,
      isAvailable: (row.is_available as boolean) ?? false,
      vehicleType: row.vehicle_type as string | null,
      vehicleCapacity: row.vehicle_capacity as number | null,
      serviceRadiusKm: (row.service_radius_km as number) ?? 10,
      homeLocation: row.home_location as { latitude: number; longitude: number } | null,
      lastActiveLocation: row.last_active_location as { latitude: number; longitude: number } | null,
      pushToken: row.push_token as string | null,
      lastLoginAt: row.last_login_at as string | null,
      lastActiveAt: row.last_active_at as string | null,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
