import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/response";
import { userController } from "./user.controller";

const router = Router();

const paramsSchema = z.object({
  id: z.string().uuid()
});

const volunteerProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).nullable().optional(),
  isAvailable: z.boolean().optional(),
  activeCaseLimit: z.coerce.number().int().min(1).max(50).optional(),
  vehicleType: z.string().trim().min(1).max(80).nullable().optional(),
  vehicleCapacity: z.coerce.number().int().min(1).max(20).nullable().optional(),
  serviceRadiusKm: z.coerce.number().positive().max(100).optional(),
  homeLocation: z
    .object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180)
    })
    .nullable()
    .optional()
});

const responderQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  caseType: z.enum(["rescue", "abuse", "conflict", "lost_pet", "abc"]).optional(),
  limit: z.coerce.number().int().positive().max(20).optional()
});

router.get(
  "/",
  authenticate,
  requireRoles("admin", "ngo", "govt"),
  asyncHandler((request, response) => userController.listUsers(request, response))
);

router.get(
  "/me/volunteer",
  authenticate,
  asyncHandler((request, response) => userController.getMyVolunteerProfile(request, response))
);

router.patch(
  "/me/volunteer",
  authenticate,
  validateBody(volunteerProfileSchema),
  asyncHandler((request, response) => userController.updateMyVolunteerProfile(request, response))
);

router.get(
  "/responders/nearby",
  authenticate,
  validateQuery(responderQuerySchema),
  asyncHandler((request, response) => userController.getNearbyResponders(request, response))
);

router.get(
  "/:id/activity",
  authenticate,
  validateParams(paramsSchema),
  asyncHandler((request, response) => userController.listVolunteerActivity(request, response))
);

router.get(
  "/:id",
  authenticate,
  validateParams(paramsSchema),
  asyncHandler((request, response) => userController.getUserById(request, response))
);

export default router;
