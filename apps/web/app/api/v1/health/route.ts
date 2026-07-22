import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HEALTH_REST_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/rest/v1/users?select=id&limit=1`
  : "";

export async function GET(req: NextRequest) {
  const checks: Record<string, unknown> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    database: null,
  };

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    checks.database = {
      status: "error",
      error: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured",
    };
    checks.status = "degraded";
    return NextResponse.json(checks, { status: 503 });
  }

  const dbCheck = await checkDatabaseDirect();
  checks.database = dbCheck;
  checks.status = dbCheck.status === "healthy" ? "healthy" : "degraded";

  const statusCode = checks.status === "healthy" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}

async function checkDatabaseDirect(): Promise<Record<string, unknown>> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(HEALTH_REST_ENDPOINT!, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
        Prefer: "count=exact",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;

    if (!res.ok) {
      const text = await res.text();
      return {
        status: "unreachable",
        latencyMs: latency,
        httpStatus: res.status,
        error: text.slice(0, 300),
      };
    }

    const countHeader =
      res.headers.get("content-range") || res.headers.get("x-total-count");
    let rowsChecked = 0;
    if (countHeader) {
      const match = countHeader.match(/\/(\d+)$/);
      if (match) rowsChecked = parseInt(match[1]);
    }

    return {
      status: "healthy",
      latencyMs: latency,
      rowsChecked,
    };
  } catch (e) {
    const latency = Date.now() - start;
    return {
      status: "error",
      latencyMs: latency,
      error: (e as Error).message,
    };
  }
}
