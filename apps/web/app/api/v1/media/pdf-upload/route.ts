import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { badRequest, created, forbidden, serverError } from "@/lib/api-response";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const MAX_SIZE = 10 * 1024 * 1024;
const BUCKET = "finding-astro-private";

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rate = await checkRateLimit(`library-pdf-init:${auth.user.id}:${getClientIp(req)}`, req.headers.get("user-agent") ?? "unknown");
  if (!rate.allowed) return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });

  try {
    const body = await req.json();
    const name = typeof body?.originalName === "string" ? body.originalName : "";
    const size = Number(body?.size);
    if (!name.toLowerCase().endsWith(".pdf") || body?.mimeType !== "application/pdf") return badRequest("INVALID_MIME_TYPE", "Library uploads must be PDF files");
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_SIZE) return badRequest("FILE_TOO_LARGE", "PDF files must be 10 MB or smaller");

    const key = `documents/${new Date().toISOString().slice(0, 10)}/${randomBytes(16).toString("hex")}.pdf`;
    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const { data: row, error: insertError } = await supabaseAdmin().from("media_uploads").insert({
      uploaded_by_id: auth.user.id, cdn_url: "", original_name: safeName, mime_type: "application/pdf",
      size_bytes: size, purpose: "document", storage_bucket: BUCKET, storage_key: key,
      visibility: "private", status: "uploading", scan_status: "pending", content_type: "application/pdf",
      byte_size: size, metadata: { upload_method: "signed_storage", original_size: size },
    }).select("id").single();
    if (insertError || !row) return serverError("Unable to initialize PDF upload", insertError);

    const { data: signed, error: signError } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(key, { upsert: false });
    if (signError || !signed?.signedUrl || !signed?.token) {
      await supabaseAdmin().from("media_uploads").update({ status: "failed" }).eq("id", row.id);
      return serverError("Unable to authorize direct PDF upload", signError);
    }
    return created({ mediaId: row.id, key, signedUrl: signed.signedUrl, token: signed.token, bucket: BUCKET }, "PDF upload authorized");
  } catch (error) {
    return serverError("Unable to initialize PDF upload", error);
  }
}
