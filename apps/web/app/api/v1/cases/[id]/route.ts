import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { decodeLocation } from "@/lib/geo";
import { mapCase } from "@/lib/types";
import { broadcastCaseEvent } from "@/lib/case-stream";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const CaseStatusEnum = z.enum(["open", "in_review", "action_taken", "resolved", "closed"]);
const CasePriorityEnum = z.enum(["low", "medium", "high"]);

const UpdateCaseSchema = z.object({
  status: CaseStatusEnum.optional(),
  priority: CasePriorityEnum.optional(),
  resolutionNotes: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "case id required");

  const { data, error } = await supabaseAdmin().from("cases").select("*").eq("id", id).single();
  if (error) return notFound("Case not found");

  const record = data as Record<string, unknown>;
  return ok(mapCase({ ...record, location: decodeLocation(record.location) }), "Case loaded");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`case-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const { id } = await params;
    if (!id) return badRequest("VALIDATION_ERROR", "case id required");

    const raw = await req.json();
    const parsed = validateBody(UpdateCaseSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, priority, resolutionNotes } = parsed.data;

    const { data: existing } = await supabaseAdmin().from("cases").select("status, priority, title, description, resolution_notes").eq("id", id).single();
    if (!existing) return notFound("Case not found");

    const current = existing.status as string;
    if (status && current !== status && !["admin", "govt", "ngo"].includes(authResult.user.role)) {
      const allowed: Record<string, string[]> = { open: ["in_review", "closed"], in_review: ["action_taken", "resolved", "closed"], action_taken: ["resolved", "closed"], resolved: ["closed"] };
      if (!(allowed[current] ?? []).includes(status)) return badRequest("INVALID_STATUS_TRANSITION", `Cannot move from "${current}" to "${status}"`);
    }

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (resolutionNotes !== undefined) update.resolution_notes = resolutionNotes;
    update.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin().from("cases").update(update).eq("id", id).select("*").single();
    if (error) return serverError(error.message);

    if (data) {
      await audit({ tableName: "cases", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: existing, newData: data });
      broadcastCaseEvent({ type: "updated", caseId: id, caseType: (existing as Record<string, unknown>).case_type as string, priority: (data as Record<string, unknown>).priority as string, status: (data as Record<string, unknown>).status as string, locationText: (data as Record<string, unknown>).location_text as string | null, timestamp: new Date().toISOString() });
    }

    return ok(mapCase({ ...(data as Record<string, unknown>), location: decodeLocation((data as Record<string, unknown>).location) }), "Case updated");
  } catch {
    return serverError();
  }
}
