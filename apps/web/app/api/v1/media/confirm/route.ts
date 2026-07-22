import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, optionalAuth } from "@/lib/auth-middleware";
import { ok, created, serverError, notFound, forbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";

const BUCKET = "finding-astro-media";

const MediaConfirmSchema = z.object({
  key: z.string().min(1),
  cdnUrl: z.string().url(),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative().optional(),
  purpose: z.string().optional(),
  linkedCaseId: z.string().uuid().optional(),
  linkedAnimalId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = validateBody(MediaConfirmSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { key, cdnUrl, originalName, mimeType, sizeBytes, purpose, linkedCaseId, linkedAnimalId } = parsed.data;
    const user = await optionalAuth(req);

    const userId = user?.id ?? "guest-emergency";

    const { data, error } = await supabaseAdmin()
      .from("media_uploads")
      .insert({
        uploaded_by_id: userId,
        cdn_url: cdnUrl,
        original_name: originalName,
        mime_type: mimeType,
        size_bytes: String(sizeBytes ?? 0),
        purpose: purpose ?? "misc",
        linked_case_id: linkedCaseId ?? null,
        linked_animal_id: linkedAnimalId ?? null,
      })
      .select("*")
      .single();

    if (error) return serverError(error.message);
    if (data) await audit({ tableName: "media_uploads", recordId: data.id, action: "INSERT", actorId: userId, actorRole: user?.role ?? "guest", newData: data });
    return created(data, "Upload confirmed");
  } catch {
    return serverError("Confirmation failed");
  }
}

export async function GET(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/api\/v1\/media\//, "").split("/");
    const [resource, id] = pathParts;

    if (resource === "case" && id) {
      const { data } = await supabaseAdmin().from("media_uploads").select("*").eq("linked_case_id", id).order("created_at", { ascending: false });
      return ok(data ?? [], "Media loaded", { count: data?.length ?? 0 });
    }
    if (resource === "animal" && id) {
      const { data } = await supabaseAdmin().from("media_uploads").select("*").eq("linked_animal_id", id).order("created_at", { ascending: false });
      return ok(data ?? [], "Media loaded", { count: data?.length ?? 0 });
    }
    return notFound("Specify /media/case/:id or /media/animal/:id");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = new URL(req.url);
    const uploadId = url.pathname.replace(/\/api\/v1\/media\//, "");

    const { data: row } = await supabaseAdmin().from("media_uploads").select("*").eq("id", uploadId).maybeSingle();
    if (!row) return notFound("Upload not found");

    const user = authResult.user;
    if (row.uploaded_by_id !== user.id && user.role !== "admin") return forbidden("You cannot delete this upload");

    await supabaseAdmin().from("media_uploads").delete().eq("id", uploadId);
    await audit({ tableName: "media_uploads", recordId: uploadId, action: "DELETE", actorId: user.id, actorRole: user.role, oldData: row });
    return ok(null, "Upload deleted");
  } catch {
    return serverError("Failed to delete upload");
  }
}
