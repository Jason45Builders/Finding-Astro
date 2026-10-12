import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().slice(0, 120);
    const category = (searchParams.get("category") ?? "").trim().slice(0, 100);
    const language = (searchParams.get("language") ?? "").trim().slice(0, 20);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 24) || 24, 1), 60);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

    let request = supabaseAdmin()
      .from("library_books")
      .select("id, title, slug, subtitle, description, author_name, publication_type, category, language, cover_storage_path, primary_file_format, is_featured, published_at", { count: "exact" })
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (query) request = request.or(`title.ilike.%${query}%,author_name.ilike.%${query}%`);
    if (category) request = request.eq("category", category);
    if (language) request = request.eq("language", language);

    const { data, error, count } = await request;
    if (error) return serverError("Unable to load the library", error);
    const books = (data ?? []).map((book) => ({ ...book, cover_url: book.cover_storage_path ? (String(book.cover_storage_path).startsWith("http") ? book.cover_storage_path : supabaseAdmin().storage.from("finding-astro-media").getPublicUrl(book.cover_storage_path).data.publicUrl) : null }));
    return ok({ books, count: count ?? 0, limit, offset });
  } catch (error) {
    return serverError("Unable to load the library", error);
  }
}
