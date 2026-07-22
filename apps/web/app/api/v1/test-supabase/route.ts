import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  try {
    const { data, error } = await supabaseAdmin()
      .from("users")
      .select("id")
      .limit(1);

    return NextResponse.json({
      status: error ? "error" : "ok",
      latencyMs: Date.now() - start,
      data,
      error,
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "threw",
        latencyMs: Date.now() - start,
        errorType: (e as Error)?.constructor?.name,
        errorMessage: (e as Error)?.message,
        stack: (e as Error)?.stack?.slice(0, 1000),
      },
      { status: 500 }
    );
  }
}
