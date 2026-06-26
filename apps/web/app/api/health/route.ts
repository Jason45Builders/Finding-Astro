import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("animals").select("id").limit(1);
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      success: !error,
      service: "finding-astro-api",
      environment: process.env.NODE_ENV ?? "development",
      db: { ok: !error, latencyMs },
      timestamp: new Date().toISOString(),
    }, { status: !error ? 200 : 503 });
  } catch {
    return NextResponse.json({ success: false, service: "finding-astro-api", db: { ok: false, latencyMs: 0 } }, { status: 503 });
  }
}
