import {NextRequest} from "next/server";
import {supabaseAdmin} from "@/lib/supabase-admin";
import {authMiddleware} from "@/lib/auth-middleware";
import {ok,notFound,serverError} from "@/lib/api-response";
type Ctx={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:Ctx){
 const auth=await authMiddleware(req);if("error" in auth)return auth.error;
 const {id}=await ctx.params;
 try{
  const {data:user,error:ue}=await supabaseAdmin().from("users").select("id,full_name,created_at").eq("id",id).maybeSingle();
  if(ue)return serverError("Unable to load contributor",ue);if(!user)return notFound("Contributor not found");
  const {data:stories,error}=await supabaseAdmin().from("community_stories").select("id,author_id,title,body,category,animal_name,animal_species,broad_location,media_urls,is_featured,published_at,created_at").eq("author_id",id).eq("status","published").order("published_at",{ascending:false}).limit(100);
  if(error)return serverError("Unable to load contributor stories",error);
  return ok({id:user.id,name:user.full_name||"Community member",joinedAt:user.created_at,stories:stories??[]});
 }catch(e){return serverError("Unable to load contributor",e);}
}
