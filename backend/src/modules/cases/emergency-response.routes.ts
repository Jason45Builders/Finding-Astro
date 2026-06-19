/**
 * emergency-response.routes.ts
 * FIX 7: Every status update notifies the reporter via caseService.notifyReporterOfResponderUpdate()
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { requiredParam } from "../../utils/express.utils";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { emergencyResponseService } from "./emergency-response.service";
import { caseService } from "./case.service";   // FIX 7

const router = Router();

const caseIdParams    = z.object({ caseId: z.string().uuid() });

const updateStatusSchema = z.object({
  status:     z.enum(["en_route","on_scene","picked_up","at_hospital","completed"]),
  hospitalId: z.string().uuid().optional(),
  notes:      z.string().trim().max(500).optional(),
});

const abandonSchema = z.object({
  reason: z.string().trim().min(5).max(300),
});

const historyQuery = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

// ── Claim a case — "I'm responding" ──────────────────────────────────────────
router.post(
  "/:caseId/claim",
  authenticate,
  validateParams(caseIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const response = await emergencyResponseService.claimCase(actor, requiredParam(req.params, "caseId"));
    // FIX 7: notify reporter that someone claimed — happens inside claimCase() already
    sendSuccess(res, response, "Case claimed — you are the primary responder");
  })
);

// ── Update responder status — FIX 7: notifies reporter on EVERY update ───────
router.patch(
  "/:caseId/status",
  authenticate,
  validateParams(caseIdParams),
  validateBody(updateStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");

    const { status, hospitalId, notes } = req.body as {
      status: "en_route" | "on_scene" | "picked_up" | "at_hospital" | "completed";
      hospitalId?: string;
      notes?: string;
    };

    // Update in the emergency response service (handles timer, DB, audit trail)
    const response = await emergencyResponseService.updateResponderStatus(
      actor,
      requiredParam(req.params, "caseId"),
      status,
      { hospitalId, notes }
    );

    // FIX 7: notify the reporter for EVERY status — not just completed
    await caseService.notifyReporterOfResponderUpdate(requiredParam(req.params, "caseId"), status);

    sendSuccess(res, response, "Status updated — reporter notified");
  })
);

// ── Abandon a claim — re-broadcasts immediately ───────────────────────────────
router.post(
  "/:caseId/abandon",
  authenticate,
  validateParams(caseIdParams),
  validateBody(abandonSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    await emergencyResponseService.abandonClaim(actor, requiredParam(req.params, "caseId"), req.body.reason);
    sendSuccess(res, null, "Claim released — case re-broadcast to other responders");
  })
);

// ── Get active response for a case (for the reporter's live status view) ──────
router.get(
  "/:caseId/response",
  authenticate,
  validateParams(caseIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const response = await emergencyResponseService.getActiveResponse(requiredParam(req.params, "caseId"));
    sendSuccess(res, response, response ? "Active response found" : "No active responder");
  })
);

// ── My response history ───────────────────────────────────────────────────────
router.get(
  "/my/history",
  authenticate,
  validateQuery(historyQuery),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const actor = req.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const history = await emergencyResponseService.getResponderHistory(
      actor.id,
      typeof req.query.limit === "number" ? req.query.limit : undefined
    );
    sendSuccess(res, history, "Responder history loaded");
  })
);

// ── Admin / pg_cron trigger — process expired claims ─────────────────────────
router.post(
  "/admin/process-expired",
  authenticate,
  requireRoles("admin"),
  asyncHandler(async (_req, res) => {
    await emergencyResponseService.processExpiredClaims();
    sendSuccess(res, null, "Expired claims processed");
  })
);

export default router;
