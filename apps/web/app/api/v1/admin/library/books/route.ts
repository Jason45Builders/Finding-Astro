import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { ok, created, badRequest, forbidden, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateBookSchema = z.object({
  title: z.string().trim().min(1).max(240),
  slug: z.string().trim().min(1).max(240).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  subtitle: z.string().trim().max(240).optional().default(""),
  description: z.string().max(12000).optional().default(""),
  authorName: z.string().trim().min(1).max(240).optional().default("Finding Astro Team"),
  publicationType: z.enum(["complete_file", "chapter_based", "hybrid"]),
  category: z.string().trim().min(1).max(100).optional().default("Finding Astro Publications"),
  language: z.string().trim().min(2).max(20).optional().default("en"),
});

function isAdmin(role: string) {
  return role.toLowerCase() === "admin";
}

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.user.role)) return forbidden("Administrator access required");

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    let query = supabaseAdmin()
      .from("library_books")
      .select("id, title, slug, subtitle, description, author_name, publication_type, category, language, cover_storage_path, primary_file_storage_path, primary_file_format, status, is_featured, rights_confirmed_at, published_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (status && ["draft", "published", "archived"].includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return serverError("Unable to load publications", error);
    return ok({ books: data ?? [] });
  } catch (error) {
    return serverError("Unable to load publications", error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (!isAdmin(auth.user.role)) return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const raw = await req.json();
    const parsed = CreateBookSchema.safeParse(raw);
    if (!parsed.success) {
      return badRequest("VALIDATION_ERROR", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
    }
    const input = parsed.data;
    const { data, error } = await supabaseAdmin()
      .from("library_books")
      .insert({
        title: input.title,
        slug: input.slug,
        subtitle: input.subtitle,
        description: input.description,
        author_name: input.authorName,
        publication_type: input.publicationType,
        category: input.category,
        language: input.language,
        status: "draft",
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select("id, title, slug, publication_type, status, created_at")
      .single();

    if (error?.code === "23505") return badRequest("SLUG_EXISTS", "A publication already uses this slug");
    if (error || !data) return serverError("Unable to create publication", error);
    return created({ book: data }, "Draft publication created");
  } catch (error) {
    return serverError("Unable to create publication", error);
  }
}
