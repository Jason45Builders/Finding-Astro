import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { data: book, error } = await supabaseAdmin()
      .from("library_books")
      .select("id, title, slug, subtitle, description, author_name, publication_type, category, language, cover_storage_path, primary_file_storage_path, primary_file_format, is_featured, published_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) return serverError("Unable to load publication", error);
    if (!book) return notFound("Publication not found");

    const { data: chapters, error: chapterError } = await supabaseAdmin()
      .from("library_chapters")
      .select("id, title, summary, sort_order, content_format")
      .eq("book_id", book.id)
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (chapterError) return serverError("Unable to load publication chapters", chapterError);
    const { primary_file_storage_path: _privatePath, ...publicBook } = book;
    return ok({ book: { ...publicBook, has_complete_file: Boolean(_privatePath), cover_url: publicBook.cover_storage_path ? (String(publicBook.cover_storage_path).startsWith("http") ? publicBook.cover_storage_path : supabaseAdmin().storage.from("finding-astro-media").getPublicUrl(publicBook.cover_storage_path).data.publicUrl) : null }, chapters: chapters ?? [] });
  } catch (error) {
    return serverError("Unable to load publication", error);
  }
}
