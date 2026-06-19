import { Router } from "express";
import { z } from "zod";
import { optionalAuthenticate, authenticate } from "../../middleware/auth.middleware";
import { validateBody, validateParams } from "../../middleware/validation.middleware";
import { requiredParam } from "../../utils/express.utils";
import { asyncHandler, sendCreated, sendSuccess } from "../../utils/response";
import { AppError } from "../../middleware/error.middleware";
import { mediaService } from "./media.service";
import { AuthenticatedRequest } from "../../types/global.types";

const router = Router();

const presignSchema = z.object({
  originalName:   z.string().trim().min(1).max(255),
  mimeType:       z.string().trim().min(1).max(80),
  sizeBytes:      z.coerce.number().int().positive().max(10 * 1024 * 1024),
  purpose:        z.enum(["animal_photo","evidence","bill","prescription","medical","profile"]),
  linkedCaseId:   z.string().uuid().nullable().optional(),
  linkedAnimalId: z.string().uuid().nullable().optional(),
});

const confirmSchema = z.object({
  key:            z.string().trim().min(1).max(500),
  cdnUrl:         z.string().url(),
  originalName:   z.string().trim().min(1).max(255),
  mimeType:       z.string().trim().min(1).max(80),
  sizeBytes:      z.coerce.number().int().positive(),
  purpose:        z.enum(["animal_photo","evidence","bill","prescription","medical","profile"]),
  linkedCaseId:   z.string().uuid().nullable().optional(),
  linkedAnimalId: z.string().uuid().nullable().optional(),
});

const paramsSchema = z.object({ id: z.string().uuid() });

router.post("/presign", optionalAuthenticate, validateBody(presignSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
   const userId = req.user?.id ?? "guest-emergency";
   const result = await mediaService.getPresignedUploadUrl(userId, req.body);
   sendCreated(res, result, "Pre-signed URL generated");
}));

router.post("/confirm", optionalAuthenticate, validateBody(confirmSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
   const userId = req.user?.id ?? "guest-emergency";
   const upload = await mediaService.confirmUpload(userId, req.body);
   sendCreated(res, upload, "Upload confirmed");
}));

router.get("/case/:id", authenticate, validateParams(paramsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const uploads = await mediaService.listUploadsForCase(requiredParam(req.params, "id"));
  sendSuccess(res, uploads, "Media loaded", { count: uploads.length });
}));

router.get("/animal/:id", authenticate, validateParams(paramsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const uploads = await mediaService.listUploadsForAnimal(requiredParam(req.params, "id"));
  sendSuccess(res, uploads, "Media loaded", { count: uploads.length });
}));

router.delete("/:id", authenticate, validateParams(paramsSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  await mediaService.deleteUpload(requiredParam(req.params, "id"), req.user.id, req.user.role);
  sendSuccess(res, null, "Upload deleted");
}));

export default router;
