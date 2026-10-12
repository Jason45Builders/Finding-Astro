import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const PRIVATE_BUCKET = "finding-astro-private";

function isSafeLibraryDocumentPath(path: string) {
  const parts = path.split("/");
  return path.startsWith("documents/") && parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { data: book, error: bookError } = await supabaseAdmin()
      .from("library_books")
      .select("id, title, primary_file_storage_path, primary_file_format")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (bookError) return serverError("Unable to load publication", bookError);
    if (!book || book.primary_file_format !== "pdf" || !book.primary_file_storage_path) {
      return notFound("A readable PDF edition is not available");
    }
    if (!isSafeLibraryDocumentPath(book.primary_file_storage_path)) {
      console.error("[library/content] Refusing unexpected storage path for publication", book.id);
      return notFound("Publication file not found");
    }

    const { data: file, error } = await supabaseAdmin()
      .storage.from(PRIVATE_BUCKET)
      .download(book.primary_file_storage_path);
    if (error || !file) return notFound("Publication file not found");

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      console.error("[library/content] Stored file is not a PDF", book.id);
      return notFound("Publication file is not available in a supported format");
    }

    const safeTitle = book.title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 100) || "Finding Astro publication";
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeTitle}.pdf"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    return serverError("Unable to open publication", error);
  }
}
