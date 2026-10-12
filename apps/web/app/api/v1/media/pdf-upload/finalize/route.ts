import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware, requireCsrf } from "@/lib/auth-middleware";
import { badRequest, created, forbidden, serverError } from "@/lib/api-response";
import { scanBuffer } from "@/lib/virus-scan";

export const dynamic = "force-dynamic";
const BUCKET = "finding-astro-private";
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req);
  if ("error" in auth) return auth.error;
  if (auth.user.role.toLowerCase() !== "admin") return forbidden("Administrator access required");
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const mediaId = typeof body?.mediaId === "string" ? body.mediaId : "";
    const key = typeof body?.key === "string" ? body.key : "";
    if (!mediaId || !/^documents\/\d{4}-\d{2}-\d{2}\/[a-f0-9]{32}\.pdf$/.test(key)) return badRequest("VALIDATION_ERROR", "Invalid PDF upload reference");

    const admin = supabaseAdmin();
    const { data: media, error: lookupError } = await admin.from("media_uploads")
      .select("id, uploaded_by_id, storage_bucket, storage_key, status, size_bytes")
      .eq("id", mediaId).maybeSingle();
    if (lookupError) return serverError("Unable to verify PDF upload", lookupError);
    if (!media || media.uploaded_by_id !== auth.user.id || media.storage_bucket !== BUCKET || media.storage_key !== key || media.status !== "uploading") {
      return badRequest("UPLOAD_NOT_FOUND", "This PDF upload is not available to finalize");
    }

    const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(key);
    if (downloadError || !blob) return badRequest("UPLOAD_INCOMPLETE", "The PDF has not reached storage yet. Please retry the upload.");
    if (blob.size <= 0 || blob.size > MAX_SIZE || blob.size !== Number(media.size_bytes)) {
      await admin.storage.from(BUCKET).remove([key]);
      await admin.from("media_uploads").update({ status: "failed" }).eq("id", mediaId);
      return badRequest("FILE_SIZE_MISMATCH", "Uploaded PDF size did not match the authorized upload");
    }
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
      await admin.storage.from(BUCKET).remove([key]);
      await admin.from("media_uploads").update({ status: "failed" }).eq("id", mediaId);
      return badRequest("INVALID_FILE_SIGNATURE", "The uploaded file is not a valid PDF");
    }

    const scan = await scanBuffer(buffer, key.split("/").pop() ?? "document.pdf");
    const scannerFailed = Boolean(scan.scanner && scan.scanner.endsWith("-error"));
    if (!scan.clean && !scannerFailed) {
      await admin.storage.from(BUCKET).remove([key]);
      await admin.from("media_uploads").update({ status: "failed", scan_status: "infected", scan_provider: scan.scanner ?? null, scan_threat: scan.threat ?? null }).eq("id", mediaId);
      return badRequest("MALWARE_DETECTED", "PDF rejected by the security scanner");
    }
    if (scannerFailed && process.env.MEDIA_SCAN_REQUIRED === "true") {
      await admin.storage.from(BUCKET).remove([key]);
      await admin.from("media_uploads").update({ status: "failed", scan_status: "error", scan_provider: scan.scanner ?? null }).eq("id", mediaId);
      return badRequest("MEDIA_SCAN_UNAVAILABLE", "Security scanning is temporarily unavailable. Please retry shortly.");
    }

    const scanStatus = !scan.scanner || scan.scanner === "none" ? "unverified" : scannerFailed ? "error" : "clean";
    const sha256 = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
    const deliveryUrl = new URL(`/api/v1/media/proxy?mediaId=${encodeURIComponent(mediaId)}`, req.url).toString();
    const { error: updateError } = await admin.from("media_uploads").update({
      cdn_url: deliveryUrl, status: "ready", scan_status: scanStatus, scan_provider: scan.scanner ?? null,
      scan_threat: scan.threat ?? null, sha256, byte_size: bytes.length, updated_at: new Date().toISOString(),
    }).eq("id", mediaId);
    if (updateError) return serverError("Unable to finalize PDF upload", updateError);
    return created({ mediaId, key, bucket: BUCKET, visibility: "private", mimeType: "application/pdf", sizeBytes: bytes.length, scanStatus }, "PDF uploaded and verified");
  } catch (error) {
    return serverError("Unable to finalize PDF upload", error);
  }
}
