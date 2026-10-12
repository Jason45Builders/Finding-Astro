import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const SaveProgressSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid().nullable().optional(),
  position: z.object({
    kind: z.enum(["chapter", "pdf_page", "text_offset"]).optional(),
    offset: z.number().int().min(0).max(1000000000).optional(),
    page: z.number().int().min(1).max(1000000).optional(),
  }).strict().optional().default({}),
});

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  const bookId = new URL(req.url).searchParams.get("bookId");

  try {
    let query = supabaseAdmin()
      .from("library_reading_progress")
      .select("book_id, chapter_id, position, updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (bookId) query = query.eq("book_id", bookId);
    const { data, error } = await query;
    if (error) return serverError("Unable to load reading progress", error);
    return ok({ progress: data ?? [] });
  } catch (error) {
    return serverError("Unable to load reading progress", error);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const raw = await req.json();
    const parsed = SaveProgressSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    const input = parsed.data;

    const { data: book, error: bookError } = await supabaseAdmin()
      .from("library_books")
      .select("id, status")
      .eq("id", input.bookId)
      .eq("status", "published")
      .maybeSingle();
    if (bookError) return serverError("Unable to validate publication", bookError);
    if (!book) return notFound("Published publication not found");

    if (input.chapterId) {
      const { data: chapter, error: chapterError } = await supabaseAdmin()
        .from("library_chapters")
        .select("id")
        .eq("id", input.chapterId)
        .eq("book_id", input.bookId)
        .eq("status", "published")
        .eq("content_format", "rich_text")
        .maybeSingle();
      if (chapterError) return serverError("Unable to validate chapter", chapterError);
      if (!chapter) return badRequest("INVALID_CHAPTER", "Chapter does not belong to this published book");
    }

    const { data, error } = await supabaseAdmin()
      .from("library_reading_progress")
      .upsert({
        user_id: auth.user.id,
        book_id: input.bookId,
        chapter_id: input.chapterId ?? null,
        position: input.position,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,book_id" })
      .select("book_id, chapter_id, position, updated_at")
      .single();

    if (error) return serverError("Unable to save reading progress", error);
    return ok({ progress: data }, "Reading progress saved");
  } catch (error) {
    return serverError("Unable to save reading progress", error);
  }
}
