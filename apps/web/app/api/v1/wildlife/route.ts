import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*wildlife\//, "");
    const body = await req.json();

    if (action === "report") {
      const { speciesCategory, condition, description, latitude, longitude, locationText, photoUrls } = body as Record<string, unknown>;
      if (!speciesCategory) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "speciesCategory required" }), { status: 400, headers: { "Content-Type": "application/json" } });

      const { data, error } = await supabaseAdmin.from("wildlife_reports").insert({
        reporter_user_id: authResult.user.id,
        species_category: speciesCategory,
        condition: condition ?? "",
        description: description ?? "",
        location: `POINT(${longitude} ${latitude})`,
        location_text: locationText ?? null,
        photo_urls: photoUrls ?? [],
        created_at: new Date().toISOString(),
      }).select("*").single();

      if (error) return serverError(error.message);
      return ok(data, "Wildlife report submitted");
    }

    if (action === "cases/" && url.pathname.includes("/close")) {
      const caseId = url.pathname.replace(/.*cases\//, "").replace(/\/close.*$/, "");
      const { error } = await supabaseAdmin.from("wildlife_reports").update({ status: "closed" }).eq("id", caseId);
      if (error) return serverError(error.message);
      return ok(null, "Wildlife case closed");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.pathname.replace(/.*wildlife\//, "");
  if (action === "species") {
    const { data, error } = await supabaseAdmin.from("wildlife_species").select("*").eq("is_active", true);
    if (error) return serverError(error.message);
    return ok(data ?? [], "Wildlife species loaded");
  }
  if (action === "centers") {
    const { data, error } = await supabaseAdmin.from("wildlife_centres").select("*");
    if (error) return serverError(error.message);
    return ok(data ?? [], "Wildlife centres loaded");
  }
  if (action.startsWith("guidance/")) {
    const species = action.replace("guidance/", "");
    const { data, error } = await supabaseAdmin.from("wildlife_species").select("*").eq("name", species).maybeSingle();
    if (error) return serverError(error.message);
    if (!data) return new Response(JSON.stringify({ success: false, code: "NOT_FOUND", message: "Species not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return ok(data, "Guidance loaded");
  }
  return new Response(null, { status: 404 });
}
