import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { created, badRequest, serverError } from "@/lib/api-response";
import { stripExifGps } from "@/lib/strip-exif";
import { scanBuffer } from "@/lib/virus-scan";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

const MAX_SIZE = 10 * 1024 * 1024;
const PUBLIC_BUCKET = "finding-astro-media";
const PRIVATE_BUCKET = "finding-astro-private";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const FOLDERS: Record<string, string> = {
  animal_photo: "animals",
  evidence: "cases/evidence",
  bill: "reimbursements/bills",
  prescription: "reimbursements/prescriptions",
  medical: "medical",
  profile: "users",
  ngo_document: "ngo/documents",
  document: "documents",
  welfare_proof: "welfare/proofs",
};

const PRIVATE_PURPOSES = new Set([
  "ngo_document",
  "document",
  "welfare_proof",
]);

type DetectedType = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif" | "application/pdf";

function cryptoRandomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function detectFileType(bytes: Uint8Array): DetectedType | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 5 &&
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "application/pdf";

  if (bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (["heic", "heix", "hevc", "hevx"].includes(brand)) return "image/heic";
    if (["heif", "heifs", "mif1", "msf1"].includes(brand)) return "image/heif";
  }

  return null;
}

function extensionForType(type: DetectedType): string {
  switch (type) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "image/heic": return ".heic";
    case "image/heif": return ".heif";
    case "application/pdf": return ".pdf";
  }
}

function isScannerError(scanner?: string) {
  return Boolean(scanner && scanner.endsWith("-error"));
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`media-upload:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({
      success: false,
      code: "RATE_LIMITED",
      message: `Too many requests. Retry after ${rate.retryAfter}s`,
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rate.retryAfter),
      },
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const originalName = String(formData.get("originalName") ?? "");
    const reportedMime = String(formData.get("mimeType") ?? file?.type ?? "").toLowerCase();
    const purpose = String(formData.get("purpose") ?? "");
    const linkedCaseId = (formData.get("linkedCaseId") as string | null) || null;
    const linkedAnimalId = (formData.get("linkedAnimalId") as string | null) || null;

    if (!file || !originalName) {
      return badRequest("VALIDATION_ERROR", "file and originalName are required");
    }
    if (file.size <= 0) return badRequest("VALIDATION_ERROR", "Uploaded file is empty");
    if (file.size > MAX_SIZE) return badRequest("FILE_TOO_LARGE", "Max 10MB per file");
    if (!ALLOWED_TYPES.has(reportedMime)) {
      return badRequest("INVALID_MIME_TYPE", `File type "${reportedMime}" not allowed`);
    }
    if (!purpose || !FOLDERS[purpose]) {
      return badRequest("VALIDATION_ERROR", "Invalid purpose");
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const detectedMime = detectFileType(bytes);

    if (!detectedMime || detectedMime !== reportedMime) {
      return badRequest("INVALID_FILE_SIGNATURE", "The uploaded file content does not match its declared type");
    }

    const scanResult = await scanBuffer(arrayBuffer, originalName);
    const scanStatus = !scanResult.scanner || scanResult.scanner === "none"
      ? "unverified"
      : isScannerError(scanResult.scanner)
        ? "error"
        : scanResult.clean ? "clean" : "infected";

    if (!scanResult.clean && !isScannerError(scanResult.scanner)) {
      await audit({
        tableName: "media_uploads",
        recordId: "rejected",
        action: "REJECT",
        actorId: authResult.user.id,
        actorRole: authResult.user.role,
        newData: {
          reason: "virus_detected",
          threat: scanResult.threat,
          scanner: scanResult.scanner,
          filename: originalName,
        },
      });
      return badRequest("MALWARE_DETECTED", `Upload rejected: ${scanResult.threat ?? "Potential malware detected"}`);
    }

    if (isScannerError(scanResult.scanner) && process.env.MEDIA_SCAN_REQUIRED === "true") {
      return badRequest("MEDIA_SCAN_UNAVAILABLE", "Security scanning is temporarily unavailable. Please retry shortly.");
    }

    const cleanedBuffer = await stripExifGps(arrayBuffer);
    const cleanedFile = new File([cleanedBuffer], file.name, {
      type: detectedMime,
      lastModified: file.lastModified,
    });

    const bucket = PRIVATE_PURPOSES.has(purpose) ? PRIVATE_BUCKET : PUBLIC_BUCKET;
    const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const folder = FOLDERS[purpose];
    const date = new Date().toISOString().slice(0, 10);
    const key = `${folder}/${date}/${cryptoRandomHex(16)}${extensionForType(detectedMime)}`;
    const sha256 = createHash("sha256").update(Buffer.from(cleanedBuffer)).digest("hex");

    const { data: mediaRow, error: mediaInsertError } = await supabaseAdmin()
      .from("media_uploads")
      .insert({
        uploaded_by_id: authResult.user.id,
        cdn_url: "",
        original_name: safeName,
        mime_type: detectedMime,
        size_bytes: cleanedBuffer.byteLength,
        purpose,
        linked_case_id: linkedCaseId,
        linked_animal_id: linkedAnimalId,
        storage_bucket: bucket,
        storage_key: key,
        visibility: bucket === PRIVATE_BUCKET ? "private" : "public",
        status: "uploading",
        scan_status: scanStatus,
        scan_provider: scanResult.scanner ?? null,
        scan_threat: scanResult.threat ?? null,
        content_type: detectedMime,
        byte_size: cleanedBuffer.byteLength,
        sha256,
        metadata: {
          client_reported_type: reportedMime,
          original_size: file.size,
        },
      })
      .select("id")
      .single();

    if (mediaInsertError || !mediaRow) {
      return serverError(mediaInsertError?.message ?? "Unable to create media record");
    }

    const mediaId = mediaRow.id as string;

    const { error: uploadErr } = await supabaseAdmin().storage.from(bucket).upload(key, cleanedFile, {
      contentType: detectedMime,
      upsert: false,
    });

    if (uploadErr) {
      await supabaseAdmin().from("media_uploads").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", mediaId);

      return serverError(uploadErr.message ?? "Storage upload failed");
    }

    const deliveryUrl = bucket === PRIVATE_BUCKET
      ? new URL(`/api/v1/media/proxy?mediaId=${encodeURIComponent(mediaId)}`, req.url).toString()
      : supabaseAdmin().storage.from(bucket).getPublicUrl(key).data.publicUrl;

    const { error: finalizeError } = await supabaseAdmin()
      .from("media_uploads")
      .update({
        cdn_url: deliveryUrl,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mediaId);

    if (finalizeError) {
      await supabaseAdmin().storage.from(bucket).remove([key]).catch(() => undefined);
      await supabaseAdmin().from("media_uploads").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", mediaId);
      return serverError(finalizeError.message);
    }

    return created({
      mediaId,
      uploadUrl: deliveryUrl,
      publicUrl: deliveryUrl,
      cdnUrl: deliveryUrl,
      key,
      bucket,
      visibility: bucket === PRIVATE_BUCKET ? "private" : "public",
      mimeType: detectedMime,
      sizeBytes: cleanedBuffer.byteLength,
      scanStatus,
    }, "Media uploaded");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[media/upload] Unexpected error:", err);
    return serverError(message, err);
  }
}
