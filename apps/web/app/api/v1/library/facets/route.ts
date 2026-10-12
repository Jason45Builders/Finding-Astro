import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("library_books")
      .select("category, language")
      .eq("status", "published")
      .order("category", { ascending: true })
      .limit(2000);

    if (error) return serverError("Unable to load library filters", error);

    const categories = Array.from(new Set((data ?? []).map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const languages = Array.from(new Set((data ?? []).map((item) => item.language).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const response = ok({ categories, languages });
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch (error) {
    return serverError("Unable to load library filters", error);
  }
}
