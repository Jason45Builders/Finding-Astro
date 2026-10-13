import {NextRequest} from "next/server";
import {z} from "zod";
import {supabaseAdmin} from "@/lib/supabase-admin";
import {authMiddleware} from "@/lib/auth-middleware";
import {ok,badRequest,forbidden,notFound,serverError} from "@/lib/api-response";
const Patch=z.object({reportId:z.string().uuid(),status:z.enum(["reviewing","resolved","dismissed"]),resolutionNote:z.string().max(1000).optional(),hideStory:z.boolean().optional()});
export async function GET(req:NextRequest){
 const auth=await authMiddleware(req);if("error" in auth)return auth.error;
 if(!["admin"].includes(auth.user.role))return forbidden("Admin access required");
 try{
  const status=new URL(req.url).searchParams.get("status")||"open";
  const {data,error}=await supabaseAdmin().from("community_story_reports").select("id,story_id,reporter_id,reason,details,status,created_at,community_stories(title,body,author_id,status)").eq("status",status).order("created_at",{ascending:true}).limit(100);
  if(error)return serverError("Unable to load moderation queue",error);return ok(data??[]);
 }catch(e){return serverError("Unable to load moderation queue",e);}
}
export async function PATCH(req:NextRequest){
 const auth=await authMiddleware(req);if("error" in auth)return auth.error;
 if(!["admin"].includes(auth.user.role))return forbidden("Admin access required");
 const parsed=Patch.safeParse(await req.json().catch(()=>null));if(!parsed.success)return badRequest("VALIDATION_ERROR","Invalid moderation decision");
 const d=parsed.data;const db=supabaseAdmin();
 try{
  const {data:report,error:lookup}=await db.from("community_story_reports").select("id,story_id").eq("id",d.reportId).maybeSingle();
  if(lookup)return serverError("Unable to find report",lookup);if(!report)return notFound("Report not found");
  const now=new Date().toISOString();
  const {error}=await db.from("community_story_reports").update({status:d.status,reviewed_by:auth.user.id,reviewed_at:now,resolution_note:d.resolutionNote||null}).eq("id",d.reportId);
  if(error)return serverError("Unable to update report",error);
  if(d.hideStory){const {error:hideError}=await db.from("community_stories").update({status:"hidden",updated_at:now}).eq("id",report.story_id);if(hideError)return serverError("Report updated but story could not be hidden",hideError);}
  return ok({reportId:d.reportId,status:d.status,storyHidden:Boolean(d.hideStory)},"Moderation decision saved");
 }catch(e){return serverError("Unable to save moderation decision",e);}
}
