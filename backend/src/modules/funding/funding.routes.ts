import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/response";
import { fundingController } from "./funding.controller";

const router = Router();

const positiveAmountSchema = z.coerce.number().positive().max(1_000_000);
const idParamsSchema = z.object({ id: z.string().uuid() });

const createFundingSchema = z.object({
  caseId:      z.string().uuid(),
  type:        z.literal("PRE_FUNDED"),
  totalAmount: positiveAmountSchema,
  hospitalId:  z.string().uuid(),
  estimateUrl: z.string().url(),
});

const donateSchema = z.object({
  fundingCaseId:   z.string().uuid(),
  amount:          positiveAmountSchema,
  simulateFailure: z.boolean().optional(),
});

const reimbursementRequestSchema = z.object({
  caseId:          z.string().uuid(),
  amountClaimed:   positiveAmountSchema,
  billUrl:         z.string().url(),
  prescriptionUrl: z.string().url(),
  doctorName:      z.string().trim().min(2).max(160),
  hospitalId:      z.string().uuid(),
});

const reimbursementVerifySchema = z.object({
  reimbursementId: z.string().uuid(),
  verified:        z.boolean(),
  notes:           z.string().trim().max(1000).nullable().optional(),
});

const payoutReleaseSchema = z.object({ fundingCaseId: z.string().uuid() });

// FIX: Only hospitals/NGOs/admins can create treatment funding pages
router.post("/create", authenticate, requireRoles("hospital", "ngo", "admin"), validateBody(createFundingSchema), asyncHandler((req, res) => fundingController.createFunding(req, res)));

// Anyone authenticated can view funding details and donate
router.get("/:id", authenticate, validateParams(idParamsSchema), asyncHandler((req, res) => fundingController.getFunding(req, res)));
router.post("/donate", authenticate, validateBody(donateSchema), asyncHandler((req, res) => fundingController.donate(req, res)));

// Citizens can request reimbursement
router.post("/reimbursement/request", authenticate, validateBody(reimbursementRequestSchema), asyncHandler((req, res) => fundingController.createReimbursementRequest(req, res)));

// FIX: Only hospitals can verify reimbursements (prevents self-approval)
router.post("/reimbursement/verify", authenticate, requireRoles("hospital"), validateBody(reimbursementVerifySchema), asyncHandler((req, res) => fundingController.verifyReimbursement(req, res)));

router.get("/reimbursement/:id", authenticate, validateParams(idParamsSchema), asyncHandler((req, res) => fundingController.getReimbursement(req, res)));

// FIX: Only admin or govt can release payouts
router.post("/payout/release", authenticate, requireRoles("admin", "govt"), validateBody(payoutReleaseSchema), asyncHandler((req, res) => fundingController.releasePayout(req, res)));

export default router;
