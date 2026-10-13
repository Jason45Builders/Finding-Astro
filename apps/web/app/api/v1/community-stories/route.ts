import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const CreateStorySchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(20).max(12000),
  category: z.enum(["rescue","adoption","everyday_kindness","happy_memory","community_impact","other"]),
  animalName: z.string().trim().max(100).optional().nullable(),
  animalSpecies: z.enum(["dog","cat","wildlife","other"]).optional().nullable(),
  broadLocation: z.string().trim().max(120).optional().nullable(),
  mediaUrls: z.array(z.string().url().max(2048)).max(6).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  try {
    const params = new URL(req.url).searchParams;
    const limit = Math.max(1, Math.min(Number(params.get("limit") ?? 12) || 12, 30));
    const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
    const category = params.get("category");
    let query = supabaseAdmin().from("community_stories")
      .select("id,author_id,title,body,category,animal_name,animal_species,broad_location,media_urls,is_featured,published_at,created_at,community_story_reactions(count),community_story_comments(count)")
      .eq("status","published").order("is_featured",{ascending:false}).order("published_at",{ascending:false})
      .range(offset, offset + limit - 1);
    if (category && ["rescue","adoption","everyday_kindness","happy_memory","community_impact","other"].includes(category)) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return serverError("Unable to load community stories", error);
    const ids = (data ?? []).map((story: any) => story.id);
    let authors: Record<string, string> = {};
    if (ids.length) {
      const authorIds = [...new Set((data ?? []).map((story: any) => story.author_id))];
      const { data: users } = await supabaseAdmin().from("users").select("id,full_name").in("id", authorIds);
      authors = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.full_name || "Community member"]));
    }
    return ok((data ?? []).map((story: any) => ({
      ...story, author_name: authors[story.author_id] ?? "Community member",
      reaction_count: story.community_story_reactions?.[0]?.count ?? 0,
      comment_count: story.community_story_comments?.[0]?.count ?? 0,
      community_story_reactions: undefined, community_story_comments: undefined,
    })), "Community stories loaded");
  } catch (error) { return serverError("Unable to load community stories", error); }
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  const rate = await checkRateLimit(`community-story-create:${auth.user.id}:${getClientIp(req)}`, req.headers.get("user-agent") ?? "unknown");
  if (!rate.allowed) return new Response(JSON.stringify({success:false,code:"RATE_LIMITED",message:"Too many submissions. Please try again later."}),{status:429,headers:{"Content-Type":"application/json","Retry-After":String(rate.retryAfter)}});
  try {
    const input = CreateStorySchema.safeParse(await req.json());
    if (!input.success) return badRequest("VALIDATION_ERROR", input.error.issues[0]?.message ?? "Invalid story");
    const d = input.data;
    const { data, error } = await supabaseAdmin().from("community_stories").insert({
      author_id: auth.user.id, title: d.title, body: d.body, category: d.category,
      animal_name: d.animalName || null, animal_species: d.animalSpecies || null,
      broad_location: d.broadLocation || null, media_urls: d.mediaUrls ?? [], status: "published",
      published_at: new Date().toISOString(),
    }).select("id,title,body,category,animal_name,animal_species,broad_location,media_urls,is_featured,published_at,created_at").single();
    if (error || !data) return serverError("Unable to publish story", error);
    return created({...data,author_id:auth.user.id,author_name:"You",reaction_count:0,comment_count:0},"Your story is now published");
  } catch (error) { return serverError("Unable to publish story", error); }
}
