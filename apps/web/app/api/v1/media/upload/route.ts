import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

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

    const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ".jpg";
    const folder = FOLDERS[purpose] ?? "misc";
    const date = new Date().toISOString().slice(0, 10);
    const key = `${folder}/${date}/${cryptoRandomHex(8)}${ext.toLowerCase()}`;

    const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET).upload(key, file, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadErr) return serverError(uploadErr.message);

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key);

    return created({ uploadUrl: publicUrl, key, cdnUrl: publicUrl }, "Upload URL generated");
  } catch {
    return serverError("Upload failed");
  }
}
