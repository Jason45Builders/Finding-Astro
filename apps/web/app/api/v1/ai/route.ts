import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const action = url.pathname.replace(/.*ai\//, "");
    const body = await req.json();

    if (action === "matches") {
      const { animalId, location } = body as Record<string, unknown>;
      const { data, error } = await supabaseAdmin.from("animals").select("*").limit(20);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Matches computed");
    }

    if (action === "duplicates") {
      const { animalId } = body as Record<string, unknown>;
      const { data, error } = await supabaseAdmin.from("animals").select("*").neq("id", animalId).limit(20);
      if (error) return serverError(error.message);
      return ok(data ?? [], "Duplicate candidates found");
    }

    return new Response(null, { status: 404 });
  } catch {
    return serverError();
  }
}
