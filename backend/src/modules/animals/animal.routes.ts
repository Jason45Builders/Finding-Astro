import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/response";
import { animalController } from "./animal.controller";

const router = Router();

const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

const createAnimalSchema = z.object({
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
  photoUrls: z.array(z.string().url()).max(8).optional(),
  isSterilized: z.boolean().optional(),
  lastSeenText: z.string().trim().min(1).max(300).nullable().optional(),
  location: locationSchema,
  caretakerUserId: z.string().uuid().nullable().optional()
});

const updateAnimalSchema = createAnimalSchema.partial().extend({
  species: z.string().trim().min(2).max(60).optional(),
  location: locationSchema.optional()
});

const sightingSchema = z.object({
  animalId: z.string().uuid().nullable().optional(),
  matchedAnimalId: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(5).max(1200),
  locationText: z.string().trim().min(1).max(300).nullable().optional(),
  location: locationSchema,
  photoUrl: z.string().url().nullable().optional(),
  confidenceScore: z.coerce.number().min(0).max(100).nullable().optional()
});

const presenceSchema = z.object({
  source: z.string().trim().min(2).max(40).optional(),
  observationNotes: z.string().trim().min(1).max(1200).nullable().optional(),
  territoryLabel: z.string().trim().min(2).max(120).nullable().optional(),
  location: locationSchema,
  seenAt: z.string().datetime().optional()
});

const vaccinationSchema = z.object({
  caseId: z.string().uuid().nullable().optional(),
  vaccineName: z.string().trim().min(2).max(120),
  administeredAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable().optional(),
  batchNumber: z.string().trim().min(1).max(80).nullable().optional(),
  notes: z.string().trim().max(1500).nullable().optional(),
  verified: z.boolean()
});

const medicalHistorySchema = z.object({
  caseId: z.string().uuid().nullable().optional(),
  abcEventId: z.string().uuid().nullable().optional(),
  entryType: z.enum(["treatment", "vaccination", "surgery", "observation"]),
  title: z.string().trim().min(3).max(180),
  notes: z.string().trim().max(2000).nullable().optional(),
  providerName: z.string().trim().min(1).max(160).nullable().optional(),
  treatmentDate: z.string().datetime(),
  costAmount: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  attachments: z.array(z.string().url()).max(10).optional()
});

const paramsSchema = z.object({ id: z.string().uuid() });

const querySchema = z.object({
  species: z.string().optional(),
  status: z.enum(["community", "lost", "found", "reunited", "adopted"]).optional(),
  queryText: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().optional(),
  territoryLabel: z.string().optional(),
  needsAttention: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  animalId: z.string().uuid().optional()
});

// Public reads — no auth required
router.get("/",                    validateQuery(querySchema),  asyncHandler((req, res) => animalController.searchAnimals(req, res)));
router.get("/territories/summary",                              asyncHandler((req, res) => animalController.getTerritorySummary(req, res)));
router.get("/sightings",           validateQuery(querySchema),  asyncHandler((req, res) => animalController.listSightings(req, res)));
router.get("/:id/insights",        validateParams(paramsSchema), asyncHandler((req, res) => animalController.getAnimalInsights(req, res)));
router.get("/:id",                 validateParams(paramsSchema), asyncHandler((req, res) => animalController.getAnimalById(req, res)));

// Authenticated writes
router.post("/",          authenticate, validateBody(createAnimalSchema), asyncHandler((req, res) => animalController.createAnimal(req, res)));
router.post("/sightings", authenticate, validateBody(sightingSchema),     asyncHandler((req, res) => animalController.reportSighting(req, res)));
router.post("/:id/seen",  authenticate, validateParams(paramsSchema), validateBody(presenceSchema), asyncHandler((req, res) => animalController.markSeenToday(req, res)));
router.patch("/:id",      authenticate, validateParams(paramsSchema), validateBody(updateAnimalSchema), asyncHandler((req, res) => animalController.updateAnimal(req, res)));

// FIX: Vaccinations restricted to verified medical/welfare organisations
router.post("/:id/vaccinations",   authenticate, requireRoles("ngo", "govt", "admin", "hospital"), validateParams(paramsSchema), validateBody(vaccinationSchema), asyncHandler((req, res) => animalController.addVaccinationRecord(req, res)));
router.post("/:id/medical-history", authenticate, requireRoles("ngo", "govt", "admin", "hospital"), validateParams(paramsSchema), validateBody(medicalHistorySchema), asyncHandler((req, res) => animalController.addMedicalHistoryEntry(req, res)));

export default router;
