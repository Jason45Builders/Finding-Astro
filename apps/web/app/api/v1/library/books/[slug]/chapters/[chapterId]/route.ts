import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string; chapterId: string }> }) {
  try {
    const { slug, chapterId } = await context.params;
    const { data: book, error: bookError } = await supabaseAdmin()
      .from("library_books")
      .select("id, title, slug")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (bookError) return serverError("Unable to load publication", bookError);
    if (!book) return notFound("Publication not found");

    const { data: chapter, error: chapterError } = await supabaseAdmin()
      .from("library_chapters")
      .select("id, title, summary, sort_order, content_format, content_body")
      .eq("id", chapterId)
      .eq("book_id", book.id)
      .eq("status", "published")
      .maybeSingle();
    if (chapterError) return serverError("Unable to load chapter", chapterError);
    if (!chapter) return notFound("Chapter not found");
    return ok({ book, chapter });
  } catch (error) {
    return serverError("Unable to load chapter", error);
  }
}
