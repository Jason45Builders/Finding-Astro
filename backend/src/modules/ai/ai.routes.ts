import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/response";
import { aiController } from "./ai.controller";

const router = Router();

const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

const matchSchema = z.object({
  animalId: z.string().uuid().optional(),
  species: z.string().trim().min(2).max(60).optional(),
  color: z.string().trim().min(1).max(120).nullable().optional(),
  location: locationSchema,
  radiusKm: z.coerce.number().positive().max(100).optional()
});

const duplicateSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  species: z.string().trim().min(2).max(60),
  breed: z.string().trim().min(1).max(80).nullable().optional(),
  gender: z.string().trim().min(1).max(20).nullable().optional(),
  color: z.string().trim().min(1).max(120).nullable().optional(),
  approxAgeMonths: z.coerce.number().int().min(0).max(600).nullable().optional(),
  size: z.string().trim().min(1).max(30).nullable().optional(),
  temperament: z.string().trim().min(1).max(80).nullable().optional(),
  distinguishingMarks: z.string().trim().min(1).max(500).nullable().optional(),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  status: z.enum(["community", "lost", "found", "reunited", "adopted"]).optional(),
  primaryPhotoUrl: z.string().url().nullable().optional(),
  photoUrls: z.array(z.string().url()).max(5).optional(),
  isSterilized: z.boolean().optional(),
  lastSeenText: z.string().trim().min(1).max(300).nullable().optional(),
  location: locationSchema,
  caretakerUserId: z.string().uuid().nullable().optional()
});

router.post(
  "/matches",
  authenticate,
  validateBody(matchSchema),
  asyncHandler((request, response) => aiController.getMatchSuggestions(request, response))
);

router.post(
  "/duplicates",
  authenticate,
  validateBody(duplicateSchema),
  asyncHandler((request, response) => aiController.getDuplicatePreview(request, response))
);

export default router;
