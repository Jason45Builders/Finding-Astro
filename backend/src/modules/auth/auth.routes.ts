import { Router } from "express";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { authController } from "./auth.controller";
import { signupSchema, loginSchema, registerPushTokenSchema } from "./auth.schema";
import { ngoVerificationService } from "../users/ngo-verification.service";
import { z } from "zod";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";

const router = Router();

router.post(
  "/signup",
  validateBody(signupSchema),
  asyncHandler((req, res) => authController.signup(req, res))
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler((req, res) => authController.login(req, res))
);

router.get(
  "/me",
  authenticate,
  asyncHandler((req, res) => authController.getMe(req, res))
);

router.post(
  "/push-token",
  authenticate,
  validateBody(registerPushTokenSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const { pushNotificationService } = await import("../notifications/push-notification.service");
    await pushNotificationService.registerToken(actor.id, req.body.token);
    sendSuccess(res, null, "Push token registered");
  })
);

const orgVerificationRequestSchema = z.object({
  requestedRole:         z.enum(["ngo", "govt", "hospital"]),
  orgRegistrationNumber: z.string().trim().min(3).max(80),
  orgName:               z.string().trim().min(2).max(160),
  supportingDocUrl:      z.string().url(),
});

const orgApprovalSchema = z.object({
  targetUserId:    z.string().uuid(),
  approved:        z.boolean(),
  grantRole:       z.enum(["ngo", "govt", "hospital"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

router.post(
  "/org-verification/request",
  authenticate,
  validateBody(orgVerificationRequestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    await ngoVerificationService.submitVerificationRequest(actor, req.body);
    sendSuccess(res, null, "Verification request submitted — admin will review within 2 business days");
  })
);

router.post(
  "/org-verification/approve",
  authenticate,
  requireRoles("admin"),
  validateBody(orgApprovalSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    await ngoVerificationService.approveVerification(actor, req.body.targetUserId, req.body);
    sendSuccess(res, null, req.body.approved ? "Organisation verified" : "Verification rejected");
  })
);

router.get(
  "/org-verification/pending",
  authenticate,
  requireRoles("admin"),
  asyncHandler(async (_req, res) => {
    const pending = await ngoVerificationService.listPendingRequests();
    sendSuccess(res, pending, "Pending verifications loaded", { count: pending.length });
  })
);

export default router;