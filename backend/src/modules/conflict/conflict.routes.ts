import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/response";
import { conflictController } from "./conflict.controller";

const router = Router();

const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

const conflictSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(2000),
  severity: z.enum(["low", "medium", "high"]),
  locationText: z.string().trim().max(300).nullable().optional(),
  location: locationSchema,
  evidenceUrls: z.array(z.string().url()).max(10).optional()
});

router.get("/", authenticate, asyncHandler((request, response) => conflictController.listConflicts(request, response)));

router.post(
  "/",
  authenticate,
  validateBody(conflictSchema),
  asyncHandler((request, response) => conflictController.logConcern(request, response))
);

export default router;
