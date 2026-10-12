import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const ReorderSchema = z.object({
  chapterIds: z.array(z.string().uuid()).max(500),
});

export async function POST(req: NextRequest, context: { params: Promise<{ bookId: string }> }) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;
  const { bookId } = await context.params;

  try {
    const raw = await req.json();
    const parsed = ReorderSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    const { data: book, error: bookError } = await supabaseAdmin()
      .from("library_books")
      .select("id")
      .eq("id", bookId)
      .maybeSingle();
    if (bookError) return serverError("Unable to validate publication", bookError);
    if (!book) return notFound("Publication not found");

    const { error } = await supabaseAdmin().rpc("reorder_library_chapters", {
      p_book_id: bookId,
      p_chapter_ids: parsed.data.chapterIds,
    });
    if (error?.message?.includes("CHAPTER_LIST_MISMATCH") || error?.message?.includes("DUPLICATE_CHAPTER_ID")) {
      return badRequest("INVALID_CHAPTER_ORDER", "The chapter list changed. Refresh the list and try again.");
    }
    if (error) return serverError("Unable to reorder chapters", error);

    return ok({ bookId, chapterIds: parsed.data.chapterIds }, "Chapters reordered");
  } catch (error) {
    return serverError("Unable to reorder chapters", error);
  }
}
