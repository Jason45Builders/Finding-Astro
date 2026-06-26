import { NextResponse } from "next/server";

export function corsHeaders(origin: string | null): Record<string, string> {
  const corsOrigin = process.env.CORS_ORIGIN ?? "";
  const allowed = corsOrigin.split(",").map(o => o.trim()).filter(Boolean);
  if (!origin || process.env.NODE_ENV === "development") {
    return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };
  }
  if (allowed.includes(origin)) {
    return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };
  }
  return { "Access-Control-Allow-Origin": "" };
}
