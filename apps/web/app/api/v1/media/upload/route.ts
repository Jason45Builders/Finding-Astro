import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authMiddleware } from "@/lib/auth-middleware";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { stripExifGps } from "@/lib/strip-exif";
import { scanBuffer } from "@/lib/virus-scan";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);
const MAX_SIZE = 10 * 1024 * 1024;
const BUCKET = "finding-astro-media";
const FOLDERS: Record<string, string> = {
  animal_photo: "animals", evidence: "cases/evidence", bill: "reimbursements/bills",
  prescription: "reimbursements/prescriptions", medical: "medical", profile: "users",
};

function cryptoRandomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes))).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const authResult = await authMiddleware(req);
  if ("error" in authResult) return authResult.error;

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`media-upload:${authResult.user.id}:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const originalName = formData.get("originalName") as string;
    const mimeType = formData.get("mimeType") as string;
    const sizeBytes = parseInt(formData.get("sizeBytes") as string ?? "0", 10);
    const purpose = formData.get("purpose") as string;
    const linkedCaseId = formData.get("linkedCaseId") as string | null;
    const linkedAnimalId = formData.get("linkedAnimalId") as string | null;

    if (!file || !originalName) return badRequest("VALIDATION_ERROR", "file and originalName are required");
    if (!ALLOWED_TYPES.has(mimeType)) return badRequest("INVALID_MIME_TYPE", `File type "${mimeType}" not allowed`);
    if (sizeBytes > MAX_SIZE) return badRequest("FILE_TOO_LARGE", "Max 10MB per file");
    if (!purpose || !FOLDERS[purpose]) return badRequest("VALIDATION_ERROR", "Invalid purpose");

    const safeName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const ext = safeName.includes(".") ? safeName.slice(safeName.lastIndexOf(".")) : ".jpg";
    const folder = FOLDERS[purpose] ?? "misc";
    const date = new Date().toISOString().slice(0, 10);
    const key = `${folder}/${date}/${cryptoRandomHex(8)}${ext.toLowerCase()}`;

    const arrayBuffer = await file.arrayBuffer();
    const isProfile = purpose === "profile";
    const scanResult = await scanBuffer(arrayBuffer, originalName);
    if (!scanResult.clean) {
      await audit({ tableName: "media_uploads", recordId: "rejected", action: "REJECT", actorId: authResult.user.id, actorRole: authResult.user.role, newData: { reason: "virus_detected", threat: scanResult.threat, scanner: scanResult.scanner, filename: originalName } });
      return badRequest("MALWARE_DETECTED", `Upload rejected: ${scanResult.threat ?? "Potential malware detected"}`);
    }
    const cleanedBuffer = isProfile ? arrayBuffer : await stripExifGps(arrayBuffer);
    const cleanedFile = new File([cleanedBuffer], file.name, { type: mimeType, lastModified: file.lastModified });

    const { error: uploadErr } = await supabaseAdmin().storage.from(BUCKET).upload(key, cleanedFile, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadErr) {
      const message = uploadErr.message ?? "Storage upload failed";
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("not found") || message.toLowerCase().includes("bucket")) {
        return new Response(JSON.stringify({ success: false, code: "STORAGE_ERROR", message: `Storage error: ${message}. Please ensure the "${BUCKET}" bucket exists in Supabase Storage.` }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      return serverError(message);
    }

    const { data: { publicUrl } } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(key);

    return created({ uploadUrl: publicUrl, publicUrl, key, cdnUrl: publicUrl }, "Upload URL generated");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[media/upload] Unexpected error:", err);
    return serverError(message, err);
  }
}
