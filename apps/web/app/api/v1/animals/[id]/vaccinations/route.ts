import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { requireOrg, hasOrgPermission } from "@/lib/org-auth";
import { ok, badRequest, serverError, notFound, forbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimalVaccination } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  vaccineName:z.string().min(1), administeredAt:z.string().min(1), expiresAt:z.string().optional(),
  batchNumber:z.string().optional(), notes:z.string().optional(), verified:z.boolean().optional(),
  status:z.enum(["verified","unverified","expired"]).optional(),
});

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const authResult=await authMiddleware(req); if ("error" in authResult) return authResult.error;
  const {id}=await params; if(!id) return badRequest("VALIDATION_ERROR","animal id required");
  let aq=supabaseAdmin().from("animals").select("id,welfare_group_id").eq("id",id);
  if(authResult.user.role==="ngo"){const o=await requireOrg(req);if(o instanceof Response)return o;aq=aq.eq("welfare_group_id",o.org.welfareGroupId);}
  const {data:animal}=await aq.maybeSingle(); if(!animal)return notFound("Animal not found");
  const {data,error}=await supabaseAdmin().from("vaccinations").select("*").eq("animal_id",id).eq("welfare_group_id",animal.welfare_group_id ?? null).order("administered_at",{ascending:false});
  if(error)return serverError(error.message); return ok((data??[]).map(mapAnimalVaccination),"Vaccinations loaded");
}

export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const authResult=await authMiddleware(req); if("error" in authResult)return authResult.error;
  const {id}=await params; if(!id)return badRequest("VALIDATION_ERROR","animal id required");
  let orgId:string|null=null;
  if(authResult.user.role==="ngo"){const o=await requireOrg(req);if(o instanceof Response)return o;if(!hasOrgPermission(o.org.permissions,"medical:write"))return forbidden("Insufficient organization permissions");orgId=o.org.welfareGroupId;}
  if(!["admin","govt","ngo","hospital"].includes(authResult.user.role))return forbidden("Only staff can create vaccination records");
  const ip=getClientIp(req),ua=req.headers.get("user-agent")??"unknown"; const rate=await checkRateLimit(\`vaccination:\${authResult.user.id}:\${ip}\`,ua);
  if(!rate.allowed)return new Response(JSON.stringify({success:false,code:"RATE_LIMITED",message:\`Too many requests. Retry after \${rate.retryAfter}s\`}),{status:429,headers:{"Content-Type":"application/json","Retry-After":String(rate.retryAfter)}});
  try{
    let aq=supabaseAdmin().from("animals").select("id,welfare_group_id").eq("id",id); if(orgId)aq=aq.eq("welfare_group_id",orgId);
    const {data:animal}=await aq.maybeSingle(); if(!animal)return notFound("Animal not found in the active organization");
    const parsed=validateBody(Schema,await req.json()); if(!parsed.ok)return parsed.response;
    const b=parsed.data;
    const {data,error}=await supabaseAdmin().from("vaccinations").insert({animal_id:id,welfare_group_id:animal.welfare_group_id??null,vaccine_name:b.vaccineName,administered_at:b.administeredAt,expires_at:b.expiresAt??null,batch_number:b.batchNumber??null,notes:b.notes??null,verified:b.verified??false,status:b.status??"unverified",administered_by_user_id:authResult.user.id}).select("*").single();
    if(error)return serverError(error.message); await audit({tableName:"vaccinations",recordId:data.id,action:"INSERT",actorId:authResult.user.id,actorRole:authResult.user.role,newData:data}); return ok(mapAnimalVaccination(data),"Vaccination record created");
  }catch{return serverError();}
}
