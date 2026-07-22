import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";

const MatchesSchema = z.object({ animalId: z.string().uuid().optional() });
const DuplicatesSchema = z.object({ animalId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*ai\//, "");
    const raw = await req.json();

    if (action === "matches") {
      const parsed = validateBody(MatchesSchema, raw);
      if (!parsed.ok) return parsed.response;
      const { animalId } = parsed.data;
      let query = supabaseAdmin().from("animals").select("*").limit(20);
      if (animalId) query = query.eq("id", animalId);
      const { data, error } = await query;
      if (error) return serverError(error.message);
      return ok(data ?? [], "Matches computed");
    }

    if (action === "duplicates") {
      const parsed = validateBody(DuplicatesSchema, raw);
      if (!parsed.ok) return parsed.response;
      const { animalId } = parsed.data;
      const { data, error } = await supabaseAdmin().from("animals").select("*").neq("id", animalId).limit(20);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Duplicate candidates found");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
