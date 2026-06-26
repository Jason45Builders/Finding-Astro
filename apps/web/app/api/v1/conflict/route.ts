import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { situationType, description, latitude, longitude, locationText, severity } = body as Record<string, unknown>;

    if (!situationType) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "situationType required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { data, error } = await supabaseAdmin.from("conflict_reports").insert({
      reporter_user_id: authResult.user.id,
      situation_type: situationType,
      description: description ?? "",
      location_text: locationText ?? null,
      location: `POINT(${longitude} ${latitude})`,
      severity: severity ?? "medium",
      created_at: new Date().toISOString(),
    }).select("*").single();

    if (error) return serverError(error.message);
    return ok(data, "Conflict report submitted");
  } catch {
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin.from("conflict_reports").select("*").limit(50);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Conflict reports loaded");
  } catch {
    return serverError();
  }
}
