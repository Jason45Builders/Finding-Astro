import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { mapRecoveryRecord } from "@/lib/types";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const CreateRecoverySchema = z.object({
  caseId: z.string().uuid(),
  animalId: z.string().uuid().optional(),
  providerName: z.string().optional(),
  providerType: z.enum(["foster", "ngo_shelter", "clinic"]),
  dailyCostInr: z.number().nonnegative(),
  startDate: z.string(),
  endDate: z.string().optional(),
  totalRaised: z.number().nonnegative().optional(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId");
  const providerType = url.searchParams.get("providerType");

  let query = supabaseAdmin().from("recovery_funding").select("*").order("created_at", { ascending: false });
  if (caseId) query = query.eq("case_id", caseId);
  if (providerType) query = query.eq("provider_type", providerType);

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return ok((data ?? []).map(mapRecoveryRecord), "Recovery records loaded");
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`recovery:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const parsed = validateBody(CreateRecoverySchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const { caseId, animalId, providerName, providerType, dailyCostInr, startDate, endDate, totalRaised, status } = parsed.data;

    const isStaff = ["admin", "govt", "ngo", "hospital"].includes(authResult.user.role);
    if (!isStaff) {
      const { data: caseRecord, error: caseError } = await supabaseAdmin().from("cases").select("reporter_user_id, assigned_to_user_id").eq("id", caseId).single();
      if (caseError || !caseRecord) return badRequest("CASE_NOT_FOUND", "Case not found");
      const caseRow = caseRecord as Record<string, unknown>;
      const isReporter = caseRow.reporter_user_id === authResult.user.id;
      const isAssigned = caseRow.assigned_to_user_id === authResult.user.id;
      if (!isReporter && !isAssigned) return badRequest("FORBIDDEN", "You can only create recovery funding for cases you reported or are assigned to");
    }

    const { data, error } = await supabaseAdmin().from("recovery_funding").insert({
      case_id: caseId,
      animal_id: animalId ?? null,
      provider_name: providerName ?? null,
      provider_type: providerType,
      daily_cost_inr: dailyCostInr,
      start_date: startDate,
      end_date: endDate ?? null,
      total_raised: totalRaised ?? 0,
      status: status ?? "active",
      created_by_user_id: authResult.user.id,
    }).select("*").single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "recovery_funding", recordId: data.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: data });
    return ok(mapRecoveryRecord(data), "Recovery record created");
  } catch {
    return serverError();
  }
}