import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { requireOrg, hasOrgPermission } from "@/lib/org-auth";
import { ok, badRequest, serverError, notFound, forbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapAnimalMedicalRecord } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const CreateMedicalRecordSchema = z.object({
  entryType: z.enum(["treatment", "vaccination", "surgery", "observation"]),
  title: z.string().min(1),
  notes: z.string().optional(),
  providerName: z.string().optional(),
  treatmentDate: z.string().min(1),
  costAmount: z.number().nonnegative().optional(),
  caseId: z.string().uuid().optional(),
  abcEventId: z.string().uuid().optional(),
  attachments: z.array(z.string().url()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  let animalQuery = supabaseAdmin().from("animals").select("id, welfare_group_id").eq("id", id);
  if (authResult.user.role === "ngo") {
    const orgResult = await requireOrg(req);
    if (orgResult instanceof Response) return orgResult;
    animalQuery = animalQuery.eq("welfare_group_id", orgResult.org.welfareGroupId);
  }
  const { data: animal } = await animalQuery.maybeSingle();
  if (!animal) return notFound("Animal not found");

  const { data, error } = await supabaseAdmin().from("medical_history").select("*").eq("animal_id", id)
    .eq("welfare_group_id", animal.welfare_group_id ?? null).order("treatment_date", { ascending: false });
  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapAnimalMedicalRecord), "Medical history loaded");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;
  const { id } = await params;
  if (!id) return badRequest("VALIDATION_ERROR", "animal id required");

  let welfareGroupId: string | null = null;
  if (authResult.user.role === "ngo") {
    const orgResult = await requireOrg(req);
    if (orgResult instanceof Response) return orgResult;
    if (!hasOrgPermission(orgResult.org.permissions, "medical:write")) return forbidden("Insufficient organization permissions");
    welfareGroupId = orgResult.org.welfareGroupId;
  }

  const privileged = ["admin", "govt", "ngo", "hospital"];
  if (!privileged.includes(authResult.user.role)) return forbidden("Only staff can create medical records");

  const ip = getClientIp(req), userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(\`medical-record:\${authResult.user.id}:\${ip}\`, userAgent);
  if (!rate.allowed) return new Response(JSON.stringify({ success:false, code:"RATE_LIMITED", message:\`Too many requests. Retry after \${rate.retryAfter}s\` }), { status:429, headers:{"Content-Type":"application/json","Retry-After":String(rate.retryAfter)} });

  try {
    let animalQuery = supabaseAdmin().from("animals").select("id, welfare_group_id").eq("id", id);
    if (welfareGroupId) animalQuery = animalQuery.eq("welfare_group_id", welfareGroupId);
    const { data: animal } = await animalQuery.maybeSingle();
    if (!animal) return notFound("Animal not found in the active organization");

    const parsed = validateBody(CreateMedicalRecordSchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const { entryType, title, notes, providerName, treatmentDate, costAmount, caseId, abcEventId, attachments } = parsed.data;

    if (caseId) {
      const { data: linkedCase } = await supabaseAdmin().from("cases").select("id, welfare_group_id").eq("id", caseId).maybeSingle();
      if (!linkedCase || linkedCase.welfare_group_id !== animal.welfare_group_id) return badRequest("CROSS_ORG_REFERENCE", "The case does not belong to the same organization as the animal");
    }

    const payload: Record<string, unknown> = {
      animal_id:id, welfare_group_id:animal.welfare_group_id ?? null, entry_type:entryType, title,
      notes:notes ?? null, provider_name:providerName ?? null, treatment_date:treatmentDate,
      cost_amount:costAmount ?? null, created_by_user_id:authResult.user.id, attachments:attachments ?? [],
    };
    if (caseId) payload.case_id = caseId;
    if (abcEventId) payload.abc_event_id = abcEventId;

    const { data, error } = await supabaseAdmin().from("medical_history").insert(payload).select("*").single();
    if (error) return serverError(error.message);
    await audit({ tableName:"medical_history", recordId:data.id, action:"INSERT", actorId:authResult.user.id, actorRole:authResult.user.role, newData:data });
    return ok(mapAnimalMedicalRecord(data), "Medical record created");
  } catch { return serverError(); }
}
