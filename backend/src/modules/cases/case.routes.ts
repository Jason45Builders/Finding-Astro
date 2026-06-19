/**
 * case.routes.ts — GUARDRAILS APPLIED
 *
 * Key changes:
 *   - Emergency report: optionalAuthenticate (no friction, any phone number)
 *   - Abuse/conflict reports: requireTier(2) — Aadhaar mandatory
 *   - Safety reports: requireTier(2) — Aadhaar mandatory
 *   - ABC requests: requireTier(2) — Aadhaar mandatory
 *   - All other case creation: requireTier(1) — registered name minimum
 *   - Case updates: authenticate (standard auth)
 *   - NGO actions: requireTier(3) — verified org only
 */

import { Router } from "express";
import { z } from "zod";
import {
  optionalAuthenticate,
  authenticate,
  requireRoles,
  requireTier,
} from "../../middleware/auth.middleware";
import { reportRateLimit } from "../../middleware/rate-limit.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler, sendSuccess, sendCreated } from "../../utils/response";
import { caseController } from "./case.controller";

const router = Router();

// ── Shared schemas ────────────────────────────────────────────────────────────
const paramsSchema = z.object({ id: z.string().uuid() });

const locationSchema = z.object({
  latitude:  z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// ── Emergency rescue: NO login required, NO tier required ────────────────────
// This is the ONLY endpoint that stays fully open.
// Justification: a person sees a bleeding dog at midnight.
// Any friction here = animal dies.
// Abuse is mitigated by: phone collection, IP rate limiting,
// credibility scoring, auto-hold for review, NGO verification.
const emergencyCaseSchema = z.object({
  caseType:    z.literal("rescue"),
  priority:    z.literal("high").optional(),
  title:       z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(3000).optional(),
  locationText:z.string().trim().max(300).optional(),
  location:    locationSchema,
  evidenceUrls:z.array(z.string().url()).max(10).optional(),
  guestPhone:  z.string().trim().min(10).max(14).optional(),
  severity:    z.enum(["critical","serious","stable_needs_care"]).optional(),
  animalType:  z.string().trim().max(40).optional(),
});

router.post(
  "/emergency",
  optionalAuthenticate,       // no block if no token — guest path open
  reportRateLimit,            // IP-based rate limit still applies
  validateBody(emergencyCaseSchema),
  asyncHandler((req, res) => caseController.createEmergencyCase(req, res))
);

// ── Regular rescue (non-emergency): requires registered name ─────────────────
// User must have provided their full name (tier 1)
const regularCaseSchema = z.object({
  animalId:     z.string().uuid().nullable().optional(),
  caseType:     z.enum(["rescue","lost_pet"]),
  priority:     z.enum(["low","medium","high"]).optional(),
  title:        z.string().trim().min(2).max(160),
  description:  z.string().trim().min(10).max(3000),
  locationText: z.string().trim().max(300).nullable().optional(),
  location:     locationSchema,
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
  animalType:   z.string().trim().max(40).optional(),
});

router.post(
  "/",
  authenticate,
  requireTier(1, "regular_case"),      // must have provided name
  reportRateLimit,
  validateBody(regularCaseSchema),
  asyncHandler((req, res) => caseController.createCase(req, res))
);

// ── ABUSE REPORTS: Aadhaar mandatory ────────────────────────────────────────
// This is the highest-misuse-risk endpoint.
// Dog haters commonly file false abuse reports to trigger removal.
// Aadhaar verification means:
//   - One real person = one Aadhaar = traceable identity
//   - False reports have real consequences (credibility drop, possible ban)
//   - Report is still auto-held for NGO review regardless of tier
const abuseReportSchema = z.object({
  animalId:     z.string().uuid().nullable().optional(),
  caseType:     z.literal("abuse"),
  title:        z.string().trim().min(10).max(160),
  description:  z.string().trim().min(30).max(3000),  // more detail required
  locationText: z.string().trim().max(300).nullable().optional(),
  location:     locationSchema,
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
  witnessCount: z.number().int().min(0).max(20).optional(),
});

router.post(
  "/abuse",
  authenticate,
  requireTier(2, "abuse_report"),     // AADHAAR REQUIRED
  reportRateLimit,
  validateBody(abuseReportSchema),
  asyncHandler((req, res) => caseController.createAbuseReport(req, res))
);

// ── CONFLICT REPORTS: Aadhaar mandatory ────────────────────────────────────
// Conflict reports (RWA vs feeders) can be weaponised.
// Verified identity means the reporter can be held accountable.
const conflictReportSchema = z.object({
  animalId:     z.string().uuid().nullable().optional(),
  caseType:     z.literal("conflict"),
  title:        z.string().trim().min(10).max(160),
  description:  z.string().trim().min(30).max(3000),
  locationText: z.string().trim().max(300).nullable().optional(),
  location:     locationSchema,
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
  severity:     z.enum(["low","medium","high"]),
});

router.post(
  "/conflict",
  authenticate,
  requireTier(2, "conflict_report"),  // AADHAAR REQUIRED
  reportRateLimit,
  validateBody(conflictReportSchema),
  asyncHandler((req, res) => caseController.createCase(req, res))
);

// ── ABC REQUESTS: Aadhaar mandatory ─────────────────────────────────────────
// An ABC request triggers municipal capture. Misuse can get healthy dogs
// permanently removed. Hardest gate on the platform.
const abcRequestSchema = z.object({
  animalId:     z.string().uuid(),  // must be a known animal
  caseType:     z.literal("abc"),
  title:        z.string().trim().min(10).max(160),
  description:  z.string().trim().min(30).max(3000),
  location:     locationSchema,
  evidenceUrls: z.array(z.string().url()).max(10).optional(),
  reason:       z.enum(["unneutered","injured_needs_surgery","rabies_risk","bite_incident"]),
});

router.post(
  "/abc",
  authenticate,
  requireTier(2, "request_abc"),      // AADHAAR REQUIRED
  reportRateLimit,
  validateBody(abcRequestSchema),
  asyncHandler((req, res) => caseController.createCase(req, res))
);

// ── Read routes ───────────────────────────────────────────────────────────────
const listCasesSchema = z.object({
  caseType:  z.enum(["rescue","abuse","conflict","lost_pet","abc"]).optional(),
  status:    z.enum(["open","in_review","action_taken","resolved","closed","VERIFIED_REIMBURSEMENT"]).optional(),
  priority:  z.enum(["low","medium","high"]).optional(),
  latitude:  z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  radiusKm:  z.coerce.number().positive().max(100).optional(),
  limit:     z.coerce.number().int().positive().max(100).optional(),
});

router.get("/",    authenticate, requireTier(1), validateQuery(listCasesSchema), asyncHandler((req, res) => caseController.listCases(req, res)));
router.get("/:id", authenticate, requireTier(1), validateParams(paramsSchema),  asyncHandler((req, res) => caseController.getCaseById(req, res)));

// ── Update routes ─────────────────────────────────────────────────────────────
const updateCaseSchema = z.object({
  assignedToUserId: z.string().uuid().nullable().optional(),
  status:           z.enum(["open","in_review","action_taken","resolved","closed","VERIFIED_REIMBURSEMENT"]).optional(),
  priority:         z.enum(["low","medium","high"]).optional(),
  title:            z.string().trim().min(2).max(160).optional(),
  description:      z.string().trim().max(3000).optional(),
  locationText:     z.string().trim().max(300).nullable().optional(),
  evidenceUrls:     z.array(z.string().url()).max(10).optional(),
  resolutionNotes:  z.string().trim().max(2000).nullable().optional(),
});

router.patch("/:id",
  authenticate,
  validateParams(paramsSchema),
  validateBody(updateCaseSchema),
  asyncHandler((req, res) => caseController.updateCase(req, res))
);

// ── NGO-only: issue verdict on a report ──────────────────────────────────────
const verdictSchema = z.object({
  verdict: z.enum(["confirmed_genuine","false_report","malicious","duplicate","unverifiable"]),
  notes:   z.string().trim().max(1000).optional(),
});

router.post("/:id/verdict",
  authenticate,
  requireTier(3, "issue_report_verdict"),   // VERIFIED NGO ONLY
  requireRoles("ngo", "admin"),
  validateParams(paramsSchema),
  validateBody(verdictSchema),
  asyncHandler((req, res) => caseController.issueVerdict(req, res))
);

// ── NGO-only: release a held case for broadcast ───────────────────────────────
router.post("/:id/release",
  authenticate,
  requireTier(3, "verify_cases"),           // VERIFIED NGO ONLY
  requireRoles("ngo", "govt", "admin"),
  validateParams(paramsSchema),
  asyncHandler((req, res) => caseController.releaseHeldCase(req, res))
);

export default router;
