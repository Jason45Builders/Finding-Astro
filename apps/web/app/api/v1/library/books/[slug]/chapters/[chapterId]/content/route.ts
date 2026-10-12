import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";
const PRIVATE_BUCKET = "finding-astro-private";
const SAFE_PDF_PATH = /^documents\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[a-f0-9]{32}\.pdf$/;

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string; chapterId: string }> }) {
  try {
    const { slug, chapterId } = await context.params;
    const admin = supabaseAdmin();
    const { data: book, error: bookError } = await admin
      .from("library_books")
      .select("id")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (bookError) return serverError("Unable to load publication", bookError);
    if (!book) return notFound("Publication not found");

    const { data: chapter, error: chapterError } = await admin
      .from("library_chapters")
      .select("title, content_format, storage_path")
      .eq("id", chapterId)
      .eq("book_id", book.id)
      .eq("status", "published")
      .eq("content_format", "pdf")
      .maybeSingle();
    if (chapterError) return serverError("Unable to load chapter", chapterError);
    if (!chapter || !chapter.storage_path || !SAFE_PDF_PATH.test(chapter.storage_path)) {
      return notFound("Chapter PDF not found");
    }

    const { data: file, error } = await admin.storage.from(PRIVATE_BUCKET).download(chapter.storage_path);
    if (error || !file) return notFound("Chapter PDF not found");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      console.error("[library/chapter-content] Stored file is not a PDF");
      return notFound("Chapter file is not available in a supported format");
    }
    const safeTitle = chapter.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 100) || "Finding Astro chapter";
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeTitle}.pdf"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    return serverError("Unable to open chapter PDF", error);
  }
}
