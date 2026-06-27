import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { count: animalCount } = await supabase.from("animals").select("*", { count: "exact", head: true });
    const { count: openCases } = await supabase.from("cases").select("*", { count: "exact", head: true }).eq("status", "open");
    const { count: resolvedCases } = await supabase.from("cases").select("*", { count: "exact", head: true }).eq("status", "resolved");
    const { count: pendingAbc } = await supabase.from("abc_events").select("*", { count: "exact", head: true }).eq("status", "open");

    const stats = {
      totalAnimals: animalCount ?? 0,
      openCases: openCases ?? 0,
      resolvedCases: resolvedCases ?? 0,
      pendingAbc: pendingAbc ?? 0,
      casesToday: 0,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
