import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, created, badRequest, forbidden, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const RichTextBlockSchema = z.object({
  type: z.enum(["paragraph", "heading", "quote"]).optional(),
  text: z.string().trim().min(1).max(10000),
  level: z.union([z.literal(2), z.literal(3)]).optional(),
}).strict();
const RichTextBodySchema = z.object({
  blocks: z.array(RichTextBlockSchema).min(1).max(100),
}).strict();

const ChapterSchema = z.object({
  title: z.string().trim().min(1).max(240),
  summary: z.string().max(2000).optional().default(""),
  sortOrder: z.number().int().min(0).optional(),
  contentFormat: z.enum(["rich_text", "pdf"]),
  contentBody: RichTextBodySchema.optional(),
  storagePath: z.string().regex(/^documents\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[a-f0-9]{32}\.pdf$/).optional(),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

export async function GET(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const { bookId } = await context.params;

  try {
    const { data, error } = await supabaseAdmin()
      .from("library_chapters")
      .select("id, book_id, title, summary, sort_order, content_format, content_body, storage_path, status, created_at, updated_at")
      .eq("book_id", bookId)
      .order("sort_order", { ascending: true });
    if (error) return serverError("Unable to load chapters", error);
    return ok({ chapters: data ?? [] });
  } catch (error) {
    return serverError("Unable to load chapters", error);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const { bookId } = await context.params;

  try {
    const { data: book, error: bookError } = await supabaseAdmin()
      .from("library_books")
      .select("id, status")
      .eq("id", bookId)
      .maybeSingle();
    if (bookError) return serverError("Unable to validate publication", bookError);
    if (!book) return notFound("Publication not found");
    if (book.status === "archived") return badRequest("BOOK_ARCHIVED", "Archived publications cannot receive new chapters");

    const raw = await req.json();
    const parsed = ChapterSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    const input = parsed.data;
    if (input.contentFormat === "rich_text" && !input.contentBody) {
      return badRequest("CONTENT_REQUIRED", "Text chapters require chapter content");
    }
    if (input.contentFormat === "pdf" && !input.storagePath) {
      return badRequest("CONTENT_REQUIRED", "PDF chapters require an uploaded PDF file");
    }
    if (input.contentFormat === "pdf" && input.storagePath && !input.storagePath.endsWith(".pdf")) {
      return badRequest("INVALID_FILE", "Chapter file must be a PDF");
    }
    const { data: maxRow, error: orderError } = input.sortOrder === undefined
      ? await supabaseAdmin().from("library_chapters").select("sort_order").eq("book_id", bookId).order("sort_order", { ascending: false }).limit(1).maybeSingle()
      : { data: null, error: null };
    if (orderError) return serverError("Unable to determine chapter order", orderError);
    const sortOrder = input.sortOrder ?? ((maxRow?.sort_order ?? -1) + 1);

    const { data, error } = await supabaseAdmin()
      .from("library_chapters")
      .insert({
        book_id: bookId,
        title: input.title,
        summary: input.summary,
        sort_order: sortOrder,
        content_format: input.contentFormat,
        content_body: input.contentFormat === "rich_text" ? input.contentBody : null,
        storage_path: input.contentFormat === "pdf" ? input.storagePath : null,
        status: input.status,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select("id, book_id, title, summary, sort_order, content_format, status, created_at")
      .single();
    if (error?.code === "23505") return badRequest("CHAPTER_ORDER_EXISTS", "Another chapter already uses this position");
    if (error) return serverError("Unable to create chapter", error);
    return created({ chapter: data }, "Chapter created");
  } catch (error) {
    return serverError("Unable to create chapter", error);
  }
}
