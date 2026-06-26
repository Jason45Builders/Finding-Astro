import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\//, "").split("/");

    if (pathParts[1] === "safety" && pathParts[2] === "guidance") {
      const situationType = pathParts[3];
      let query = supabaseAdmin.from("behaviour_guidance").select("*").eq("published", true);
      if (situationType) query = query.eq("situation_type", situationType);
      const { data, error } = await query;
      if (error) return serverError(error.message);
      return ok(data ?? [], "Guidance loaded");
    }

    if (pathParts[1] === "safety" && pathParts[2] === "zones") {
      const { data, error } = await supabaseAdmin.from("safety_zones").select("*");
      if (error) return serverError(error.message);
      return ok(data ?? [], "Zones loaded");
    }

    if (pathParts[1] === "safety" && pathParts[2] === "outcomes") {
      const ward = url.searchParams.get("ward");
      let query = supabaseAdmin.from("public_outcomes").select("*");
      if (ward) query = query.eq("ward_name", ward);
      const { data, error } = await query.limit(50);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Outcomes loaded");
    }

    if (pathParts[1] === "safety" && pathParts[2] === "ward-summary") {
      const ward = url.searchParams.get("ward");
      let query = supabaseAdmin.from("wards").select("*");
      if (ward) query = query.eq("name", ward);
      const { data, error } = await query;
      if (error) return serverError(error.message);
      return ok(data ?? [], "Ward summary loaded");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*safety\//, "");

    if (action === "report") {
      const body = await req.json();
      const { situationType, description, latitude, longitude, locationText, severity, animalId } = body as Record<string, unknown>;
      if (!situationType) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "situationType required" }), { status: 400, headers: { "Content-Type": "application/json" } });

      const { data, error } = await supabaseAdmin.from("safety_reports").insert({
        reporter_user_id: authResult.user.id,
        situation_type: situationType, description,
        location_text: locationText ?? null,
        location: `POINT(${longitude} ${latitude})`,
        severity: severity ?? "medium",
        animal_id: animalId ?? null,
        created_at: new Date().toISOString(),
      }).select("*").single();

      if (error) return serverError(error.message);
      return ok(data, "Safety report submitted");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
