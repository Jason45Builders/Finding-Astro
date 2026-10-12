import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateBookSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  slug: z.string().trim().min(1).max(240).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  subtitle: z.string().trim().max(240).optional(),
  description: z.string().max(12000).optional(),
  authorName: z.string().trim().min(1).max(240).optional(),
  publicationType: z.enum(["complete_file", "chapter_based", "hybrid"]).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  language: z.string().trim().min(2).max(20).optional(),
  coverStoragePath: z.string().max(1024).nullable().optional(),
  primaryFileStoragePath: z.string().max(1024).nullable().optional(),
  primaryFileFormat: z.literal("pdf").nullable().optional(),
  rightsConfirmed: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isFeatured: z.boolean().optional(),
});

function isAdmin(role: string) {
  return role.toLowerCase() === "admin";
}

export async function GET(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.user.role)) return forbidden("Administrator access required");
  const { bookId } = await context.params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("library_books")
      .select("id, title, slug, subtitle, description, author_name, publication_type, category, language, cover_storage_path, primary_file_storage_path, primary_file_format, status, is_featured, rights_confirmed_at, published_at, created_at, updated_at")
      .eq("id", bookId)
      .maybeSingle();
    if (error) return serverError("Unable to load publication", error);
    if (!data) return notFound("Publication not found");
    return ok({ book: data });
  } catch (error) {
    return serverError("Unable to load publication", error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.user.role)) return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const { bookId } = await context.params;

  try {
    const raw = await req.json();
    const parsed = UpdateBookSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    const input = parsed.data;
    const isSafeStoragePath = (value: string, prefix: string) => {
      const parts = value.split("/");
      return value.startsWith(prefix) && !value.includes(String.fromCharCode(92)) && parts.every((part) => part.length > 0 && part !== "." && part !== ".." && !Array.from(part).some((char) => char.charCodeAt(0) < 32));
    };
    if (typeof input.coverStoragePath === "string" && !isSafeStoragePath(input.coverStoragePath, "animals/")) {
      return badRequest("INVALID_COVER_PATH", "Cover must reference an uploaded public image asset");
    }
    if (typeof input.primaryFileStoragePath === "string" && !isSafeStoragePath(input.primaryFileStoragePath, "documents/")) {
      return badRequest("INVALID_BOOK_PATH", "Complete-book files must reference an uploaded private document asset");
    }
    const { data: current, error: readError } = await supabaseAdmin()
      .from("library_books")
      .select("id, publication_type, primary_file_storage_path, primary_file_format, status, rights_confirmed_at")
      .eq("id", bookId)
      .maybeSingle();
    if (readError) return serverError("Unable to validate publication", readError);
    if (!current) return notFound("Publication not found");

    const changes: Record<string, unknown> = { updated_by: auth.user.id, updated_at: new Date().toISOString() };
    if (input.title !== undefined) changes.title = input.title;
    if (input.slug !== undefined) changes.slug = input.slug;
    if (input.subtitle !== undefined) changes.subtitle = input.subtitle;
    if (input.description !== undefined) changes.description = input.description;
    if (input.authorName !== undefined) changes.author_name = input.authorName;
    if (input.publicationType !== undefined) changes.publication_type = input.publicationType;
    if (input.category !== undefined) changes.category = input.category;
    if (input.language !== undefined) changes.language = input.language;
    if (input.coverStoragePath !== undefined) changes.cover_storage_path = input.coverStoragePath;
    if (input.primaryFileStoragePath !== undefined) changes.primary_file_storage_path = input.primaryFileStoragePath;
    if (input.primaryFileFormat !== undefined) changes.primary_file_format = input.primaryFileFormat;
    if (input.isFeatured !== undefined) changes.is_featured = input.isFeatured;
    if (input.rightsConfirmed === true) {
      changes.rights_confirmed_at = new Date().toISOString();
      changes.rights_confirmed_by = auth.user.id;
    }
    if (input.rightsConfirmed === false) {
      changes.rights_confirmed_at = null;
      changes.rights_confirmed_by = null;
    }

    const finalStatus = input.status ?? current.status;
    if (finalStatus === "published") {
      const finalType = input.publicationType ?? current.publication_type;
      const finalFile = input.primaryFileStoragePath !== undefined ? input.primaryFileStoragePath : current.primary_file_storage_path;
      const finalFormat = input.primaryFileFormat !== undefined ? input.primaryFileFormat : current.primary_file_format;
      const rightsConfirmed = input.rightsConfirmed === true || (input.rightsConfirmed !== false && Boolean(current.rights_confirmed_at));
      if (!rightsConfirmed) return badRequest("RIGHTS_CONFIRMATION_REQUIRED", "Confirm publication rights before publishing");

      const requiresCompletePdf = finalType === "complete_file" || finalType === "hybrid";
      if (requiresCompletePdf && (!finalFile || finalFormat !== "pdf")) {
        return badRequest("CONTENT_REQUIRED", "Upload a supported PDF edition before publishing this publication type");
      }
      if (finalType === "chapter_based" || finalType === "hybrid") {
        const { count, error: chapterError } = await supabaseAdmin()
          .from("library_chapters")
          .select("id", { count: "exact", head: true })
          .eq("book_id", bookId)
          .eq("status", "published")
          .eq("content_format", "rich_text");
        if (chapterError) return serverError("Unable to validate chapters", chapterError);
        if (!count) return badRequest("CONTENT_REQUIRED", "Add at least one published, readable text chapter before publishing");
      }
      changes.published_at = new Date().toISOString();
    }
    if (input.status !== undefined) changes.status = input.status;

    const { data, error } = await supabaseAdmin()
      .from("library_books")
      .update(changes)
      .eq("id", bookId)
      .select("id, title, slug, publication_type, status, rights_confirmed_at, published_at, updated_at")
      .single();
    if (error?.code === "23505") return badRequest("SLUG_EXISTS", "A publication already uses this slug");
    if (error?.code === "23514") return badRequest("PUBLISH_VALIDATION_FAILED", "Publication is missing required content or rights confirmation");
    if (error) return serverError("Unable to update publication", error);
    return ok({ book: data }, "Publication updated");
  } catch (error) {
    return serverError("Unable to update publication", error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.user.role)) return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const { bookId } = await context.params;

  try {
    // Archive instead of hard-delete so reading history and storage cleanup can be handled safely.
    const { data, error } = await supabaseAdmin()
      .from("library_books")
      .update({ status: "archived", updated_by: auth.user.id, updated_at: new Date().toISOString() })
      .eq("id", bookId)
      .select("id, status")
      .maybeSingle();
    if (error) return serverError("Unable to archive publication", error);
    if (!data) return notFound("Publication not found");
    return ok({ book: data }, "Publication archived");
  } catch (error) {
    return serverError("Unable to archive publication", error);
  }
}
