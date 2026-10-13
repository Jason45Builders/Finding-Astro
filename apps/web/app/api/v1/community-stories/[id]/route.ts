import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/api-response";

type Ctx = { params: Promise<{ id: string }> };
const EditSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  body: z.string().trim().min(20).max(12000).optional(),
  category: z.enum(["rescue","adoption","everyday_kindness","happy_memory","community_impact","other"]).optional(),
  animalName: z.string().trim().max(100).nullable().optional(),
  animalSpecies: z.enum(["dog","cat","wildlife","other"]).nullable().optional(),
  broadLocation: z.string().trim().max(120).nullable().optional(),
  mediaUrls: z.array(z.string().url().max(2048)).max(6).optional(),
});
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await authMiddleware(req); if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const { data, error } = await supabaseAdmin().from("community_stories").select("*").eq("id",id).eq("status","published").maybeSingle();
    if (error) return serverError("Unable to load story",error);
    if (!data) return notFound("Story not found");
    const { data: author } = await supabaseAdmin().from("users").select("full_name").eq("id",data.author_id).maybeSingle();
    const { data: reactions } = await supabaseAdmin().from("community_story_reactions").select("user_id,reaction").eq("story_id",id);
    const { data: comments } = await supabaseAdmin().from("community_story_comments").select("id,author_id,body,created_at").eq("story_id",id).eq("status","published").order("created_at",{ascending:true}).limit(100);
    const authorIds = [...new Set((comments ?? []).map((c:any)=>c.author_id))];
    const { data: commentAuthors } = authorIds.length ? await supabaseAdmin().from("users").select("id,full_name").in("id",authorIds) : {data:[]};
    const names = Object.fromEntries((commentAuthors ?? []).map((u:any)=>[u.id,u.full_name || "Community member"]));
    const { data: bookmark } = await supabaseAdmin().from("community_story_bookmarks").select("story_id").eq("story_id",id).eq("user_id",auth.user.id).maybeSingle();
    return ok({...data,author_name:author?.full_name || "Community member",reactions:reactions ?? [],comments:(comments ?? []).map((c:any)=>({...c,author_name:names[c.author_id] || "Community member"})),bookmarked:Boolean(bookmark)});
  } catch (error) { return serverError("Unable to load story",error); }
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await authMiddleware(req); if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const parsed = EditSchema.safeParse(await req.json().catch(()=>null));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) return badRequest("VALIDATION_ERROR","Provide valid story fields to update");
  try {
    const { data: existing, error: lookupError } = await supabaseAdmin().from("community_stories").select("author_id").eq("id",id).maybeSingle();
    if (lookupError) return serverError("Unable to verify story ownership",lookupError);
    if (!existing) return notFound("Story not found");
    if (existing.author_id !== auth.user.id && !["admin","govt"].includes(auth.user.role)) return forbidden("You can only edit your own stories");
    const d = parsed.data;
    const patch: Record<string,unknown> = {updated_at:new Date().toISOString()};
    if (d.title !== undefined) patch.title=d.title;
    if (d.body !== undefined) patch.body=d.body;
    if (d.category !== undefined) patch.category=d.category;
    if (d.animalName !== undefined) patch.animal_name=d.animalName;
    if (d.animalSpecies !== undefined) patch.animal_species=d.animalSpecies;
    if (d.broadLocation !== undefined) patch.broad_location=d.broadLocation;
    if (d.mediaUrls !== undefined) patch.media_urls=d.mediaUrls;
    const {data,error}=await supabaseAdmin().from("community_stories").update(patch).eq("id",id).select("*").single();
    if(error || !data) return serverError("Unable to update story",error);
    return ok(data,"Story updated");
  } catch(error){return serverError("Unable to update story",error);}
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await authMiddleware(req); if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const {data:existing,error:lookupError}=await supabaseAdmin().from("community_stories").select("author_id").eq("id",id).maybeSingle();
    if(lookupError) return serverError("Unable to verify story ownership",lookupError);
    if(!existing) return notFound("Story not found");
    if(existing.author_id!==auth.user.id && !["admin","govt"].includes(auth.user.role)) return forbidden("You can only delete your own stories");
    const {error}=await supabaseAdmin().from("community_stories").delete().eq("id",id);
    if(error) return serverError("Unable to delete story",error);
    return ok({id},"Story deleted");
  } catch(error){return serverError("Unable to delete story",error);}
}
