import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateChapterSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  summary: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  contentFormat: z.enum(["rich_text", "pdf", "epub"]).optional(),
  contentBody: z.record(z.unknown()).nullable().optional(),
  storagePath: z.string().trim().min(1).max(1024).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ bookId: string; chapterId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const { bookId, chapterId } = await context.params;

  try {
    const raw = await req.json();
    const parsed = UpdateChapterSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    const input = parsed.data;
    const { data: current, error: readError } = await supabaseAdmin()
      .from("library_chapters")
      .select("id, content_format, content_body, storage_path, book_id")
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .maybeSingle();
    if (readError) return serverError("Unable to load chapter", readError);
    if (!current) return notFound("Chapter not found");

    const format = input.contentFormat ?? current.content_format;
    const body = input.contentBody !== undefined ? input.contentBody : current.content_body;
    const path = input.storagePath !== undefined ? input.storagePath : current.storage_path;
    if (format === "rich_text" && !body) return badRequest("CONTENT_REQUIRED", "Structured chapter content is required");
    if (format !== "rich_text" && !path) return badRequest("CONTENT_REQUIRED", "A chapter file is required for this format");

    const changes: Record<string, unknown> = { updated_by: auth.user.id, updated_at: new Date().toISOString() };
    if (input.title !== undefined) changes.title = input.title;
    if (input.summary !== undefined) changes.summary = input.summary;
    if (input.sortOrder !== undefined) changes.sort_order = input.sortOrder;
    if (input.contentFormat !== undefined) changes.content_format = format;
    if (input.contentBody !== undefined || input.contentFormat !== undefined) changes.content_body = format === "rich_text" ? body : null;
    if (input.storagePath !== undefined || input.contentFormat !== undefined) changes.storage_path = format === "rich_text" ? null : path;
    if (input.status !== undefined) changes.status = input.status;

    const { data, error } = await supabaseAdmin()
      .from("library_chapters")
      .update(changes)
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .select("id, book_id, title, summary, sort_order, content_format, status, updated_at")
      .single();
    if (error?.code === "23505") return badRequest("CHAPTER_ORDER_EXISTS", "Another chapter already uses this position");
    if (error?.code === "23514") return badRequest("CONTENT_REQUIRED", "Chapter content is incomplete");
    if (error) return serverError("Unable to update chapter", error);
    return ok({ chapter: data }, "Chapter updated");
  } catch (error) {
    return serverError("Unable to update chapter", error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ bookId: string; chapterId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const { bookId, chapterId } = await context.params;

  try {
    // Soft-hide chapter rather than deleting it, so references and reader history can be reconciled.
    const { data, error } = await supabaseAdmin()
      .from("library_chapters")
      .update({ status: "draft", updated_by: auth.user.id, updated_at: new Date().toISOString() })
      .eq("id", chapterId)
      .eq("book_id", bookId)
      .select("id, status")
      .maybeSingle();
    if (error) return serverError("Unable to hide chapter", error);
    if (!data) return notFound("Chapter not found");
    return ok({ chapter: data }, "Chapter moved to draft");
  } catch (error) {
    return serverError("Unable to hide chapter", error);
  }
}
