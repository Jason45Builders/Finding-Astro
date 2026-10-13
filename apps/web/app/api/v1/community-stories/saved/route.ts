import {NextRequest} from "next/server";
import {supabaseAdmin} from "@/lib/supabase-admin";
import {authMiddleware} from "@/lib/auth-middleware";
import {ok,serverError} from "@/lib/api-response";
export async function GET(req:NextRequest){
 const auth=await authMiddleware(req);if("error" in auth)return auth.error;
 try{
  const {data:rows,error}=await supabaseAdmin().from("community_story_bookmarks").select("story_id,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
  if(error)return serverError("Unable to load saved stories",error);
  const ids=(rows??[]).map((r:any)=>r.story_id);if(!ids.length)return ok([]);
  const {data:stories,error:se}=await supabaseAdmin().from("community_stories").select("id,author_id,title,body,category,animal_name,animal_species,broad_location,media_urls,is_featured,published_at,created_at").in("id",ids).eq("status","published");
  if(se)return serverError("Unable to load saved stories",se);
  const map=new Map((stories??[]).map((s:any)=>[s.id,s]));
  const authorIds=[...new Set((stories??[]).map((s:any)=>s.author_id))];
  const {data:users}=authorIds.length?await supabaseAdmin().from("users").select("id,full_name").in("id",authorIds):{data:[]};
  const names=Object.fromEntries((users??[]).map((u:any)=>[u.id,u.full_name||"Community member"]));
  return ok(ids.map((id:string)=>map.get(id)).filter(Boolean).map((s:any)=>({...s,author_name:names[s.author_id]||"Community member"})));
 }catch(e){return serverError("Unable to load saved stories",e);}
}
