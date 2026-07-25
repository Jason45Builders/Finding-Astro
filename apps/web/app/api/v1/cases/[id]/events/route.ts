import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";

function mapCaseEvent(row: Record<string, unknown>) {
  const actor = row.users as { role?: string } | null;
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    eventType: (row.to_status as string | null) ?? "update",
    actorRole: actor?.role ?? null,
    actorUserId: row.actor_id as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const id = url.pathname.replace(/\/api\/v1\/cases\//, "").replace(/\/events\/?$/, "");
  if (!id) return badRequest("VALIDATION_ERROR", "case id required");

  const { data, error } = await supabaseAdmin()
    .from("case_events")
    .select("*, users(role)")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok((data ?? []).map((row) => mapCaseEvent(row as Record<string, unknown>)), "Case events loaded");
}
