import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const UpdateFeedbackSchema = z.object({
  status: z.enum(["open", "in_review", "resolved", "wont_fix"]).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
  if (!isStaff) return badRequest("FORBIDDEN", "Admin access required");

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`admin-feedback-update:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = validateBody(UpdateFeedbackSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { status, adminNotes } = parsed.data;

    const { data: existing } = await supabaseAdmin().from("beta_feedback").select("*").eq("id", id).single();
    if (!existing) return notFound("Feedback not found");

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) update.status = status;
    if (adminNotes !== undefined) update.admin_notes = adminNotes;
    if (status && status !== (existing as Record<string, unknown>).status) {
      update.reviewed_by = authResult.user.id;
      update.reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin().from("beta_feedback").update(update).eq("id", id).select("*").single();
    if (error || !data) return serverError(error?.message ?? "Failed to update feedback");

    await audit({ tableName: "beta_feedback", recordId: id, action: "UPDATE", actorId: authResult.user.id, actorRole: authResult.user.role, oldData: existing, newData: data });
    return ok({ id: (data as Record<string, unknown>).id as string }, "Feedback updated");
  } catch {
    return serverError("Failed to update feedback");
  }
}
