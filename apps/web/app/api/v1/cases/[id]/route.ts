import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { requireOrg, hasOrgPermission } from "@/lib/org-auth";
import { ok, badRequest, serverError, notFound, forbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { decodeLocation } from "@/lib/geo";
import { mapCase } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { broadcastCaseEvent } from "@/lib/case-stream";

const CaseStatusEnum = z.enum(["open", "in_review", "action_taken", "resolved", "closed"]);
const CasePriorityEnum = z.enum(["low", "medium", "high"]);
const UpdateCaseSchema = z.object({ status: CaseStatusEnum.optional(), priority: CasePriorityEnum.optional(), resolutionNotes: z.string().optional() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "case id required");

  let query = supabaseAdmin().from("cases").select("*").eq("id", id);
  if (authResult.user.role === "ngo") {
    const orgResult = await requireOrg(req);
    if (orgResult instanceof Response) return orgResult;
    query = query.eq("welfare_group_id", orgResult.org.welfareGroupId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return notFound("Case not found");
  const record = data as Record<string, unknown>;
  return ok(mapCase({ ...record, location: decodeLocation(record.location) }), "Case loaded");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`case-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });

  try {
    const { id } = await params;
    if (!id) return badRequest("VALIDATION_ERROR", "case id required");

    let orgId: string | null = null;
    if (authResult.user.role === "ngo") {
      const orgResult = await requireOrg(req);
      if (orgResult instanceof Response) return orgResult;
      if (!hasOrgPermission(orgResult.org.permissions, "cases:write")) return forbidden("Insufficient organization permissions");
      orgId = orgResult.org.welfareGroupId;
    }

    const raw = await req.json();
    const parsed = validateBody(UpdateCaseSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, priority, resolutionNotes } = parsed.data;

    let existingQuery = supabaseAdmin().from("cases").select("status, priority, title, description, resolution_notes, case_type, location_text, welfare_group_id").eq("id", id);
    if (orgId) existingQuery = existingQuery.eq("welfare_group_id", orgId);
    const { data: existing } = await existingQuery.maybeSingle();
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

    let updateQuery = supabaseAdmin().from("cases").update(update).eq("id", id);
    if (orgId) updateQuery = updateQuery.eq("welfare_group_id", orgId);
    const { data, error } = await updateQuery.select("*").single();
    if (error) return serverError(error.message);

    if (data) {
      await audit({ tableName: "cases", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: existing, newData: data });
      broadcastCaseEvent({ type: "updated", caseId: id, caseType: existing.case_type as string, priority: data.priority as string, status: data.status as string, locationText: data.location_text as string | null, timestamp: new Date().toISOString() });
    }

    return ok(mapCase({ ...(data as Record<string, unknown>), location: decodeLocation((data as Record<string, unknown>).location) }), "Case updated");
  } catch {
    return serverError();
  }
}
