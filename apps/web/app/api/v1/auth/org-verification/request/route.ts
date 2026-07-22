import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const OrgVerificationRequestSchema = z.object({
  orgName: z.string().min(1),
  registrationNumber: z.string().optional(),
  orgType: z.string().optional(),
  address: z.string().optional(),
  documentUrls: z.array(z.string().url()).optional(),
  requestedTier: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const raw = await req.json();
    const parsed = validateBody(OrgVerificationRequestSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { orgName, registrationNumber, orgType, address, documentUrls, requestedTier } = parsed.data;

    await supabaseAdmin().from("ngo_verifications").insert({
      user_id: authResult.user.id,
      org_name: orgName,
      registration_number: registrationNumber ?? null,
      org_type: orgType ?? "ngo",
      address: address ?? null,
      document_urls: documentUrls ?? [],
      requested_tier: requestedTier ?? 3,
      status: "pending",
    });
    await audit({ tableName: "ngo_verifications", recordId: authResult.user.id, action: "INSERT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { org_name: orgName, org_type: orgType ?? "ngo", requested_tier: requestedTier ?? 3 } });
    return ok(null, "Verification request submitted");
  } catch {
    return serverError("Failed to submit verification request");
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const { data, error } = await supabaseAdmin()
    .from("ngo_verifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return serverError(error.message);
  return ok(data ?? [], "Pending verifications loaded");
}
