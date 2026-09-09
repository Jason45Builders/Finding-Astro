import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

function mapMemorial(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    dogName: row.dog_name as string,
    category: row.category as string,
    description: row.description as string,
    bestMemory: row.best_memory as string | null,
    location: row.location as string | null,
    latitude: row.location_geog ? Number((row.location_geog as { y: number }).y || 0) : null,
    longitude: row.location_geog ? Number((row.location_geog as { x: number }).x || 0) : null,
    dateOfDeath: row.date_of_death as string,
    causeOfDeath: row.cause_of_death as string | null,
    evidenceUrls: (row.evidence_urls as string[]) ?? [],
    reporterUserId: row.reporter_user_id as string,
    isAnonymous: Boolean(row.is_anonymous),
    isVerified: Boolean(row.is_verified),
    isPublic: Boolean(row.is_public),
    verifiedBy: row.verified_by as string | null,
    verifiedAt: row.verified_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const VerifySchema = z.object({
  isVerified: z.boolean(),
  isPublic: z.boolean().optional(),
  adminNotes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin().from("memorial_posts").select("*").eq("id", id).maybeSingle();
    if (error || !data) return notFound("Memorial not found");

    const memorial = mapMemorial(data);
    const isAdmin = ["admin", "govt", "ngo"].includes(authResult.user.role);
    const isReporter = memorial.reporterUserId === authResult.user.id;

    if (!memorial.isPublic && !isAdmin && !isReporter) {
      return notFound("Memorial not found");
    }

    return ok(memorial, "Memorial loaded");
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  if (!["admin", "govt", "ngo"].includes(authResult.user.role)) {
    return badRequest("FORBIDDEN", "Only admins can verify memorials");
  }

  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = validateBody(VerifySchema, raw);
    if (!parsed.ok) return parsed.response;
    const { isVerified, isPublic, adminNotes } = parsed.data;

    const { data: existing, error: fetchError } = await supabaseAdmin().from("memorial_posts").select("*").eq("id", id).maybeSingle();
    if (fetchError || !existing) return notFound("Memorial not found");

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (isVerified) {
      update.is_verified = true;
      update.verified_by = authResult.user.id;
      update.verified_at = new Date().toISOString();
    } else {
      update.is_verified = false;
      update.verified_by = null;
      update.verified_at = null;
    }
    if (isPublic !== undefined) update.is_public = isPublic;
    if (adminNotes !== undefined) update.admin_notes = adminNotes;

    const { data, error } = await supabaseAdmin().from("memorial_posts").update(update).eq("id", id).select("*").single();
    if (error || !data) return serverError(error?.message ?? "Failed to update memorial");

    return ok(mapMemorial(data), "Memorial updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const { data: existing, error: fetchError } = await supabaseAdmin().from("memorial_posts").select("reporter_user_id, category").eq("id", id).maybeSingle();
    if (fetchError || !existing) return notFound("Memorial not found");

    const isAdmin = ["admin", "govt", "ngo"].includes(authResult.user.role);
    const isReporter = existing.reporter_user_id === authResult.user.id;
    if (!isAdmin && !isReporter) return badRequest("FORBIDDEN", "You cannot delete this memorial");

    const { error } = await supabaseAdmin().from("memorial_posts").delete().eq("id", id);
    if (error) return serverError(error.message);

    return ok(null, "Memorial deleted");
  } catch {
    return serverError();
  }
}
