import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError, notFound } from "@/lib/api-response";
type Ctx={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:Ctx){
 const auth=await authMiddleware(req);if("error" in auth)return auth.error;
 const {id}=await ctx.params;
 try{
  const {data:story,error:se}=await supabaseAdmin().from("community_stories").select("id").eq("id",id).eq("status","published").maybeSingle();
  if(se)return serverError("Unable to load story",se);if(!story)return notFound("Story not found");
  const {data,error}=await supabaseAdmin().from("community_story_comments").select("id,author_id,body,created_at").eq("story_id",id).eq("status","published").order("created_at",{ascending:true}).limit(100);
  if(error)return serverError("Unable to load comments",error);
  const ids=[...new Set((data??[]).map((x:any)=>x.author_id))];
  const {data:users}=ids.length?await supabaseAdmin().from("users").select("id,full_name").in("id",ids):{data:[]};
  const names=Object.fromEntries((users??[]).map((u:any)=>[u.id,u.full_name||"Community member"]));
  return ok((data??[]).map((x:any)=>({...x,author_name:names[x.author_id]||"Community member"})));
 }catch(error){return serverError("Unable to load comments",error);}
}
