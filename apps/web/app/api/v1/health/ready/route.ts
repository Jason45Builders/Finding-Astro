import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const checks: Record<string, unknown> = {
    status: "ready",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    database: null,
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    checks.database = {
      status: "error",
      error: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured",
    };
    checks.status = "not_ready";
    return NextResponse.json(checks, { status: 503 });
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "count=exact",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;

    if (!res.ok) {
      const text = await res.text();
      checks.database = {
        status: "unreachable",
        latencyMs: latency,
        httpStatus: res.status,
        error: text.slice(0, 300),
      };
      checks.status = "not_ready";
      return NextResponse.json(checks, { status: 503 });
    }

    checks.database = {
      status: "healthy",
      latencyMs: latency,
    };
    return NextResponse.json(checks, { status: 200 });
  } catch (e) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - start,
      error: (e as Error).message,
    };
    checks.status = "not_ready";
    return NextResponse.json(checks, { status: 503 });
  }
}
