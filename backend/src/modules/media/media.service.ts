import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import path from "node:path";
import { query } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";
import { logger } from "../../utils/logger";

const ALLOWED_TYPES = new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const FOLDERS: Record<string, string> = {
  animal_photo: "animals", evidence: "cases/evidence",
  bill: "reimbursements/bills", prescription: "reimbursements/prescriptions",
  medical: "medical", profile: "users",
};

const buildR2 = (): S3Client | null => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
};

const r2 = buildR2();
const BUCKET = env.R2_BUCKET_NAME;
const CDN = (env.R2_PUBLIC_CDN_URL ?? "").replace(/\/$/, "");

interface UploadRow {
  id: string; uploaded_by_id: string; cdn_url: string;
  original_name: string | null; mime_type: string | null;
  size_bytes: string | null; purpose: string | null;
  linked_case_id: string | null; linked_animal_id: string | null;
  created_at: Date;
}

const map = (r: UploadRow) => ({
  id: r.id, uploadedById: r.uploaded_by_id, cdnUrl: r.cdn_url,
  originalName: r.original_name, mimeType: r.mime_type,
  sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
  purpose: r.purpose, linkedCaseId: r.linked_case_id,
  linkedAnimalId: r.linked_animal_id, createdAt: r.created_at,
});

class MediaService {
  async getPresignedUploadUrl(uploadedById: string, opts: {
    originalName: string; mimeType: string; sizeBytes: number; purpose: string;
    linkedCaseId?: string | null; linkedAnimalId?: string | null;
  }) {
    if (!ALLOWED_TYPES.has(opts.mimeType)) {
      throw new AppError(`File type "${opts.mimeType}" not allowed. Use JPEG, PNG, WEBP, HEIC, or PDF.`, 422, "INVALID_MIME_TYPE");
    }
    if (opts.sizeBytes > MAX_SIZE) {
      throw new AppError("File too large. Maximum 10MB.", 422, "FILE_TOO_LARGE");
    }

    const ext = path.extname(opts.originalName).toLowerCase() || ".jpg";
    const folder = FOLDERS[opts.purpose] ?? "misc";
    const date = new Date().toISOString().slice(0, 10);
    const key = `${folder}/${date}/${uploadedById.slice(0,8)}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    const cdnUrl = `${CDN}/${key}`;

    if (!r2 || env.NODE_ENV === "development") {
      logger.info("DEV: mock presigned URL", { key });
      return { presignedUrl: `http://localhost:4000/dev-mock-upload/${key}`, key, cdnUrl };
    }

    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: opts.mimeType, ContentLength: opts.sizeBytes });
    const presignedUrl = await getSignedUrl(r2, cmd, { expiresIn: 300 });
    return { presignedUrl, key, cdnUrl };
  }

  async confirmUpload(uploadedById: string, opts: {
    key: string; cdnUrl: string; originalName: string; mimeType: string;
    sizeBytes: number; purpose: string;
    linkedCaseId?: string | null; linkedAnimalId?: string | null;
  }) {
    const result = await query<UploadRow>(
      `INSERT INTO media_uploads(uploaded_by_id,cdn_url,original_name,mime_type,size_bytes,purpose,linked_case_id,linked_animal_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uploadedById, opts.cdnUrl, opts.originalName, opts.mimeType, opts.sizeBytes, opts.purpose, opts.linkedCaseId ?? null, opts.linkedAnimalId ?? null]
    );
    logger.info("Upload confirmed", { id: result.rows[0].id, purpose: opts.purpose });
    return map(result.rows[0]);
  }

  async listUploadsForCase(caseId: string) {
    const r = await query<UploadRow>(`SELECT * FROM media_uploads WHERE linked_case_id=$1 ORDER BY created_at DESC`, [caseId]);
    return r.rows.map(map);
  }

  async listUploadsForAnimal(animalId: string) {
    const r = await query<UploadRow>(`SELECT * FROM media_uploads WHERE linked_animal_id=$1 ORDER BY created_at DESC`, [animalId]);
    return r.rows.map(map);
  }

  async deleteUpload(uploadId: string, requesterId: string, requesterRole: string) {
    const r = await query<UploadRow>(`SELECT * FROM media_uploads WHERE id=$1 LIMIT 1`, [uploadId]);
    const row = r.rows[0];
    if (!row) throw new AppError("Upload not found", 404, "NOT_FOUND");
    if (row.uploaded_by_id !== requesterId && requesterRole !== "admin") {
      throw new AppError("You cannot delete this upload", 403, "FORBIDDEN");
    }
    if (r2 && row.cdn_url) {
      try {
        const key = new URL(row.cdn_url).pathname.slice(1);
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      } catch (err) { logger.error("R2 delete failed", { err }); }
    }
    await query(`DELETE FROM media_uploads WHERE id=$1`, [uploadId]);
  }
}

export const mediaService = new MediaService();
