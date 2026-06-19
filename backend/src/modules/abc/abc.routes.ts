import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { reportRateLimit } from "../../middleware/rate-limit.middleware";
import { validateBody, validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/response";
import { abcController } from "./abc.controller";

const router = Router();

const locationSchema = z.object({
  latitude:  z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

const requestSchema = z.object({
  animalId:     z.string().uuid(),
  notes:        z.string().trim().max(1000).nullable().optional(),
  locationText: z.string().trim().max(300).nullable().optional(),
  location:     locationSchema,
});

const eventSchema = z.object({
  animalId:  z.string().uuid(),
  caseId:    z.string().uuid().nullable().optional(),
  eventType: z.enum(["request", "capture", "surgery", "return"]),
  status:    z.string().trim().min(3).max(80),
  notes:     z.string().trim().max(1000).nullable().optional(),
  location:  locationSchema,
});

const querySchema = z.object({ animalId: z.string().uuid().optional() });

// PUBLIC — anyone can view ABC tracking (transparency)
router.get("/tracking", validateQuery(querySchema), asyncHandler((req, res) => abcController.listTracking(req, res)));

// Citizens can REQUEST sterilisation
router.post("/requests", authenticate, reportRateLimit, validateBody(requestSchema), asyncHandler((req, res) => abcController.createRequest(req, res)));

// Only NGO/Govt/Admin/Hospital can LOG field events (surgery, capture, return)
router.post("/events", authenticate, requireRoles("ngo", "govt", "admin", "hospital"), validateBody(eventSchema), asyncHandler((req, res) => abcController.logEvent(req, res)));

export default router;
