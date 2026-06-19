/**
 * wildlife.routes.ts + safety.routes.ts combined
 * PLACE AT: backend/src/modules/cases/wildlife.routes.ts
 * Register in app.ts (already done in updated app.ts below)
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { requiredParam } from "../../utils/express.utils";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { wildlifeService } from "./wildlife.service";
import { safetyService } from "./safety.service";

// ══════════════════════════════════════════════════════════════════════════════
// WILDLIFE ROUTES
// ══════════════════════════════════════════════════════════════════════════════
const wildlifeRouter = Router();

const wildlifeReportSchema = z.object({
  speciesCategory: z.enum(["snake","bird","monkey","reptile","mammal","other"]),
  condition: z.enum(["injured","trapped","in_building","sighted_only","unknown"]),
  description: z.string().trim().min(5).max(2000),
  location: z.object({
    latitude:  z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
  locationText: z.string().trim().max(300).nullable().optional(),
  photoUrls: z.array(z.string().url()).max(5).optional(),
});

const closeWildlifeCaseSchema = z.object({
  outcome: z.enum(["released_to_habitat","transferred_to_sanctuary","deceased"]),
  notes: z.string().trim().max(500).optional(),
});

const caseIdParams = z.object({ caseId: z.string().uuid() });
const speciesQuery = z.object({ species: z.string().optional() });
const locationQuery = z.object({
  latitude:  z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  species:   z.string().optional(),
  radiusKm:  z.coerce.number().positive().optional(),
});

// PUBLIC — get guidance for a species BEFORE reporting (shown instantly)
wildlifeRouter.get(
  "/guidance/:species",
  asyncHandler(async (req, res) => {
    const guidance = await wildlifeService.getSpeciesGuidance(requiredParam(req.params, "species"));
    sendSuccess(res, guidance, "Guidance loaded");
  })
);

// PUBLIC — list all species categories
wildlifeRouter.get(
  "/species",
  asyncHandler(async (_req, res) => {
    const species = await wildlifeService.listSpeciesCategories();
    sendSuccess(res, species, "Species loaded");
  })
);

// PUBLIC — list wildlife centers (with optional location filter)
wildlifeRouter.get(
  "/centers",
  validateQuery(locationQuery),
  asyncHandler(async (req, res) => {
    const latitude = typeof req.query.latitude === "number" ? req.query.latitude : undefined;
    const longitude = typeof req.query.longitude === "number" ? req.query.longitude : undefined;
    const species = typeof req.query.species === "string" ? req.query.species : "other";
    const radiusKm = typeof req.query.radiusKm === "number" ? req.query.radiusKm : undefined;
    const centers = latitude !== undefined && longitude !== undefined
      ? await wildlifeService.findNearestCenters({ latitude, longitude }, species, radiusKm)
      : await wildlifeService.listCenters();
    sendSuccess(res, centers, "Wildlife centers loaded");
  })
);

// AUTHENTICATED — file a wildlife rescue report
wildlifeRouter.post(
  "/report",
  authenticate,
  validateBody(wildlifeReportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const result = await wildlifeService.reportWildlife({
      ...req.body,
      reporterUserId: actor.id,
    });
    sendSuccess(res, result, "Wildlife rescue reported — authorised responders notified");
  })
);

// NGO/Admin — close a wildlife case
wildlifeRouter.patch(
  "/cases/:caseId/close",
  authenticate,
  requireRoles("ngo","govt","admin"),
  validateParams(caseIdParams),
  validateBody(closeWildlifeCaseSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    await wildlifeService.closeWildlifeCase(actor, requiredParam(req.params, "caseId"), req.body.outcome, req.body.notes);
    sendSuccess(res, null, "Wildlife case closed");
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY & COEXISTENCE ROUTES
// ══════════════════════════════════════════════════════════════════════════════
const safetyRouter = Router();

const safetyReportSchema = z.object({
  situationType: z.enum(["feel_unsafe","aggression_concern","bite_incident","pack_concern","child_safety"]),
  description: z.string().trim().min(5).max(2000),
  location: z.object({
    latitude:  z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
  locationText: z.string().trim().max(300).nullable().optional(),
  severity: z.enum(["low","medium","high"]).optional(),
  animalId: z.string().uuid().nullable().optional(),
});

const qrGenerateSchema = z.object({
  qrType: z.enum(["animal","zone","feeding_point","case","abc_status"]),
  linkedAnimalId: z.string().uuid().nullable().optional(),
  linkedZoneId: z.string().uuid().nullable().optional(),
  linkedCaseId: z.string().uuid().nullable().optional(),
  location: z.object({
    latitude:  z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }).nullable().optional(),
  locationText: z.string().trim().max(300).nullable().optional(),
  displayLabel: z.string().trim().max(160).nullable().optional(),
});

const wardQuery = z.object({ ward: z.string().optional() });
const locationQuery2 = z.object({
  latitude:  z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  radiusKm:  z.coerce.number().positive().optional(),
});

// PUBLIC — get all behaviour guidance cards
safetyRouter.get(
  "/guidance",
  asyncHandler(async (_req, res) => {
    const cards = await safetyService.getAllGuidance();
    sendSuccess(res, cards, "Guidance cards loaded");
  })
);

// PUBLIC — guidance for a specific situation type
safetyRouter.get(
  "/guidance/:situationType",
  asyncHandler(async (req, res) => {
    const cards = await safetyService.getGuidanceForSituation(requiredParam(req.params, "situationType"));
    sendSuccess(res, cards, "Guidance loaded");
  })
);

// AUTHENTICATED — report a safety concern ("I feel unsafe")
safetyRouter.post(
  "/report",
  authenticate,
  validateBody(safetyReportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const result = await safetyService.reportSafetyСoncern(actor, req.body);
    sendSuccess(res, result, "Safety concern recorded");
  })
);

// PUBLIC — safe awareness zones nearby
safetyRouter.get(
  "/zones",
  validateQuery(locationQuery2),
  asyncHandler(async (req, res) => {
    const latitude = typeof req.query.latitude === "number" ? req.query.latitude : undefined;
    const longitude = typeof req.query.longitude === "number" ? req.query.longitude : undefined;
    const radiusKm = typeof req.query.radiusKm === "number" ? req.query.radiusKm : undefined;
    const zones = await safetyService.listSafeZones(
      latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined,
      radiusKm
    );
    sendSuccess(res, zones, "Safe zones loaded");
  })
);

// PUBLIC — recent visible outcomes ("Dog rescued 2 hours ago")
safetyRouter.get(
  "/outcomes",
  validateQuery(wardQuery),
  asyncHandler(async (req, res) => {
    const outcomes = await safetyService.getRecentOutcomes(typeof req.query.ward === "string" ? req.query.ward : undefined);
    sendSuccess(res, outcomes, "Recent outcomes loaded");
  })
);

// PUBLIC — ward summary (ABC coverage, animal counts)
safetyRouter.get(
  "/ward-summary",
  validateQuery(wardQuery),
  asyncHandler(async (req, res) => {
    const summary = await safetyService.getWardSummary(typeof req.query.ward === "string" ? req.query.ward : undefined);
    sendSuccess(res, summary, "Ward summary loaded");
  })
);

// PUBLIC — response metrics (time to action)
safetyRouter.get(
  "/metrics",
  asyncHandler(async (_req, res) => {
    const metrics = await safetyService.getResponseMetrics();
    sendSuccess(res, metrics, "Response metrics loaded");
  })
);

// PUBLIC — resolve a QR code scan
safetyRouter.get(
  "/qr/:code",
  asyncHandler(async (req, res) => {
    const result = await safetyService.resolveQrScan(requiredParam(req.params, "code"));
    sendSuccess(res, result, "QR code resolved");
  })
);

// NGO/Admin — generate QR code for signage
safetyRouter.post(
  "/qr/generate",
  authenticate,
  requireRoles("ngo","govt","admin"),
  validateBody(qrGenerateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const qr = await safetyService.generateQrCode(actor, req.body);
    sendSuccess(res, qr, "QR code generated");
  })
);

export { wildlifeRouter, safetyRouter };
