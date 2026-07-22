import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { LocationSchema, validateBody } from "@/lib/validation";

const WildlifeReportSchema = z.object({
  speciesCategory: z.string().min(1),
  condition: z.string(),
  description: z.string().min(1),
  location: LocationSchema,
  locationText: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*wildlife\//, "");
    const body = await req.json();

    if (action === "report") {
      const raw = await req.json();
      const parsed = validateBody(WildlifeReportSchema, raw);
      if (!parsed.ok) return parsed.response;
      const { speciesCategory, condition, description, location: loc, locationText, photoUrls } = parsed.data;

      const { data, error } = await supabaseAdmin().from("wildlife_reports").insert({
        reporter_user_id: authResult.user.id,
        species_category: speciesCategory,
        condition,
        description,
        location: `POINT(${loc.longitude} ${loc.latitude})`,
        location_text: locationText ?? null,
        photo_urls: photoUrls ?? [],
        created_at: new Date().toISOString(),
      }).select("*").single();

      if (error) return serverError(error.message);
      return ok(data, "Wildlife report submitted");
    }

    if (action === "cases/" && url.pathname.includes("/close")) {
      const caseId = url.pathname.replace(/.*cases\//, "").replace(/\/close.*$/, "");
      const { error } = await supabaseAdmin().from("wildlife_reports").update({ status: "closed", closed_at: new Date().toISOString(), closed_by_user_id: authResult.user.id }).eq("id", caseId);
      if (error) return serverError(error.message);
      return ok(null, "Wildlife case closed");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
