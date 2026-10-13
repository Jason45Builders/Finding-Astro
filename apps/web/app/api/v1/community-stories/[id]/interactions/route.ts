import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, created, badRequest, notFound, conflict, serverError } from "@/lib/api-response";
type Ctx={params:Promise<{id:string}>};
const Schema=z.object({action:z.enum(["react","unreact","comment","bookmark","unbookmark","report"]),reaction:z.enum(["heart","inspiring","pawprint","thank_you"]).optional(),body:z.string().trim().min(1).max(2000).optional(),reason:z.enum(["harassment","privacy","animal_welfare","spam","misinformation","other"]).optional(),details:z.string().max(1000).optional()});
export async function POST(req:NextRequest,ctx:Ctx){
 const auth=await authMiddleware(req); if("error" in auth)return auth.error;
 const {id}=await ctx.params; const parsed=Schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return badRequest("VALIDATION_ERROR","Invalid interaction payload");
 const d=parsed.data; const db=supabaseAdmin();
 try{
  const {data:story,error:storyError}=await db.from("community_stories").select("id").eq("id",id).eq("status","published").maybeSingle();
  if(storyError)return serverError("Unable to verify story",storyError); if(!story)return notFound("Story not found");
  if(d.action==="react"){
   if(!d.reaction)return badRequest("VALIDATION_ERROR","Choose a reaction");
   const {error}=await db.from("community_story_reactions").upsert({story_id:id,user_id:auth.user.id,reaction:d.reaction},{onConflict:"story_id,user_id"});
   if(error)return serverError("Unable to save reaction",error); return ok({storyId:id,reaction:d.reaction},"Reaction saved");
  }
  if(d.action==="unreact"){const {error}=await db.from("community_story_reactions").delete().eq("story_id",id).eq("user_id",auth.user.id);if(error)return serverError("Unable to remove reaction",error);return ok({storyId:id},"Reaction removed");}
  if(d.action==="comment"){
   if(!d.body)return badRequest("VALIDATION_ERROR","Comment cannot be empty");
   const {data,error}=await db.from("community_story_comments").insert({story_id:id,author_id:auth.user.id,body:d.body,status:"published"}).select("id,story_id,author_id,body,created_at").single();
   if(error||!data)return serverError("Unable to post comment",error);return created({...data,author_name:"You"},"Comment posted");
  }
  if(d.action==="bookmark"){
   const {error}=await db.from("community_story_bookmarks").upsert({story_id:id,user_id:auth.user.id},{onConflict:"story_id,user_id"});
   if(error)return serverError("Unable to save bookmark",error);return ok({storyId:id,bookmarked:true},"Story saved");
  }
  if(d.action==="unbookmark"){const {error}=await db.from("community_story_bookmarks").delete().eq("story_id",id).eq("user_id",auth.user.id);if(error)return serverError("Unable to remove bookmark",error);return ok({storyId:id,bookmarked:false},"Bookmark removed");}
  if(d.action==="report"){
   if(!d.reason)return badRequest("VALIDATION_ERROR","Choose a report reason");
   const {error}=await db.from("community_story_reports").insert({story_id:id,reporter_id:auth.user.id,reason:d.reason,details:d.details||null});
   if(error?.code==="23505")return conflict("You have already reported this story");
   if(error)return serverError("Unable to submit report",error);return created({storyId:id},"Report submitted for review");
  }
  return badRequest("VALIDATION_ERROR","Unsupported action");
 }catch(error){return serverError("Unable to save interaction",error);}
}
