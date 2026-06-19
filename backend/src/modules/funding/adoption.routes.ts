/**
 * adoption.routes.ts + csr.routes.ts + recovery-transport.routes.ts
 * PLACE AT: backend/src/modules/funding/adoption.routes.ts
 * Register all three in app.ts.
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { requiredParam } from "../../utils/express.utils";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest } from "../../types/global.types";
import { adoptionService } from "./adoption.service";
import { csrService } from "./csr.service";
import { recoveryTransportService } from "./recovery-transport.service";

// ═══════════════════════════════════════════════════════════════════════════
// ADOPTION ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const adoptionRouter = Router();
const idP = z.object({ id: z.string().uuid() });

const applySchema = z.object({
  animalId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(20),
  address: z.string().trim().min(5).max(500),
  livingSituation: z.enum(["house_with_yard","apartment","shared_accommodation","other"]),
  hasOtherPets: z.boolean(),
  otherPetsDesc: z.string().trim().max(300).nullable().optional(),
  priorExperience: z.enum(["none","some","experienced"]),
  hoursAlonePerDay: z.coerce.number().int().min(0).max(24),
  reasonForAdopting: z.string().trim().min(10).max(2000),
});

const reviewSchema = z.object({
  approved: z.boolean(),
  reviewNotes: z.string().trim().max(1000).nullable().optional(),
  rejectionReason: z.string().trim().max(500).nullable().optional(),
});

const trialSchema = z.object({ trialDays: z.union([z.literal(3), z.literal(5), z.literal(7)]).default(7) });

const followupSchema = z.object({ notes: z.string().trim().min(5).max(2000) });

const returnSchema = z.object({ reason: z.string().trim().min(5).max(500) });

const markAdoptableSchema = z.object({
  animalId: z.string().uuid(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const blacklistSchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  reason: z.string().trim().min(5).max(500),
});

const listQuery = z.object({
  status: z.enum(["pending_review","approved","trial","adopted","rejected","returned"]).optional(),
  animalId: z.string().uuid().optional(),
  species: z.string().trim().optional(),
});

// Public — adoptable animals listing
adoptionRouter.get("/animals", validateQuery(listQuery), asyncHandler(async (req, res) => {
  const animals = await adoptionService.listAdoptable({ species: typeof req.query.species === "string" ? req.query.species : undefined });
  sendSuccess(res, animals, "Adoptable animals loaded");
}));

// Get adoption agreement text
adoptionRouter.get("/agreement", asyncHandler(async (_req, res) => {
  sendSuccess(res, adoptionService.getAgreementText(), "Agreement loaded");
}));

// Mark animal as adoptable (NGO/admin)
adoptionRouter.post("/mark-adoptable", authenticate, requireRoles("ngo","govt","admin"), validateBody(markAdoptableSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const actor = req.user!;
  await adoptionService.markAdoptable(req.body.animalId, actor, req.body.notes);
  sendSuccess(res, null, "Animal marked as adoptable");
}));

// Apply to adopt
adoptionRouter.post("/apply", authenticate, validateBody(applySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.apply(req.user!, req.body);
  sendSuccess(res, app, "Application submitted — you will be contacted for screening");
}));

// List applications
adoptionRouter.get("/applications", authenticate, validateQuery(listQuery), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const apps = await adoptionService.list(req.user!, { status: typeof req.query.status === "string" ? req.query.status as any : undefined, animalId: typeof req.query.animalId === "string" ? req.query.animalId : undefined });
  sendSuccess(res, apps, "Applications loaded");
}));

// Get single application
adoptionRouter.get("/applications/:id", authenticate, validateParams(idP), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.getById(req.user!, requiredParam(req.params, "id"));
  sendSuccess(res, app, "Application loaded");
}));

// Review (NGO/admin)
adoptionRouter.patch("/applications/:id/review", authenticate, requireRoles("ngo","govt","admin"), validateParams(idP), validateBody(reviewSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.review(req.user!, requiredParam(req.params, "id"), req.body);
  sendSuccess(res, app, "Application reviewed");
}));

// Start trial
adoptionRouter.post("/applications/:id/trial", authenticate, requireRoles("ngo","govt","admin"), validateParams(idP), validateBody(trialSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.startTrial(req.user!, requiredParam(req.params, "id"), req.body.trialDays);
  sendSuccess(res, app, "Trial period started");
}));

// Confirm adoption (applicant accepts agreement)
adoptionRouter.post("/applications/:id/confirm", authenticate, validateParams(idP), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.confirm(req.user!, requiredParam(req.params, "id"));
  sendSuccess(res, app, "Adoption confirmed");
}));

// Handle return
adoptionRouter.post("/applications/:id/return", authenticate, requireRoles("ngo","govt","admin"), validateParams(idP), validateBody(returnSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.handleReturn(req.user!, requiredParam(req.params, "id"), req.body.reason);
  sendSuccess(res, app, "Return processed");
}));

// Record follow-up
adoptionRouter.post("/applications/:id/followup", authenticate, requireRoles("ngo","govt","admin"), validateParams(idP), validateBody(followupSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await adoptionService.recordFollowup(req.user!, requiredParam(req.params, "id"), req.body.notes);
  sendSuccess(res, app, "Follow-up recorded");
}));

// Blacklist
adoptionRouter.post("/blacklist", authenticate, requireRoles("ngo","govt","admin"), validateBody(blacklistSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const record = await adoptionService.addToBlacklist(req.user!, req.body);
  sendSuccess(res, record, "Added to blacklist");
}));

// ═══════════════════════════════════════════════════════════════════════════
// CSR ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const csrRouter = Router();

const sponsorSchema = z.object({
  orgName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().max(120).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().trim().max(20).nullable().optional(),
  registrationNumber: z.string().trim().max(80).nullable().optional(),
  commitmentType: z.enum(["pooled","ward","module","matching"]),
  committedAmountInr: z.coerce.number().positive(),
  matchingRatio: z.coerce.number().min(0.1).max(10).nullable().optional(),
  matchingCapInr: z.coerce.number().positive().nullable().optional(),
  activeFrom: z.string().optional(),
  activeUntil: z.string().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const wardSchema = z.object({
  sponsorId: z.string().uuid(),
  wardName: z.string().trim().min(2).max(160),
  monthlyBudgetInr: z.coerce.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format"),
});

const allocateSchema = z.object({
  sponsorId: z.string().uuid(),
  caseId: z.string().uuid(),
  amountInr: z.coerce.number().positive(),
  fundingCaseId: z.string().uuid().nullable().optional(),
  wardName: z.string().trim().nullable().optional(),
  transactionType: z.enum(["case_allocation","matching","transport","recovery","ward_pool"]).optional(),
  referenceNote: z.string().trim().max(500).nullable().optional(),
});

// Public — impact report (transparency)
csrRouter.get("/impact", asyncHandler(async (_req, res) => {
  const report = await csrService.getImpactReport();
  sendSuccess(res, report, "CSR impact report loaded");
}));

// Public — list sponsors
csrRouter.get("/sponsors", asyncHandler(async (_req, res) => {
  const sponsors = await csrService.listSponsors();
  sendSuccess(res, sponsors, "Sponsors loaded");
}));

// Public — ward sponsorships for current month
csrRouter.get("/wards", validateQuery(z.object({ month: z.string().optional() })), asyncHandler(async (req, res) => {
  const wards = await csrService.listWardSponsorships(typeof req.query.month === "string" ? req.query.month : undefined);
  sendSuccess(res, wards, "Ward sponsorships loaded");
}));

// Admin — register sponsor
csrRouter.post("/sponsors", authenticate, requireRoles("admin"), validateBody(sponsorSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const sponsor = await csrService.registerSponsor(req.user!, req.body);
  sendSuccess(res, sponsor, "Sponsor registered");
}));

// Admin — create ward sponsorship
csrRouter.post("/wards", authenticate, requireRoles("admin"), validateBody(wardSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const ward = await csrService.createWardSponsorship(req.user!, req.body);
  sendSuccess(res, ward, "Ward sponsorship created");
}));

// Admin — allocate to a case
csrRouter.post("/allocate", authenticate, requireRoles("admin"), validateBody(allocateSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const tx = await csrService.allocateToCse(req.user!, req.body);
  sendSuccess(res, tx, "CSR funds allocated");
}));

// ═══════════════════════════════════════════════════════════════════════════
// RECOVERY + TRANSPORT ROUTES
// ═══════════════════════════════════════════════════════════════════════════
const recoveryRouter = Router();

const recoverySchema = z.object({
  caseId: z.string().uuid(),
  animalId: z.string().uuid().nullable().optional(),
  providerName: z.string().trim().max(160).nullable().optional(),
  providerType: z.enum(["foster","ngo_shelter","clinic"]),
  dailyCostInr: z.coerce.number().min(0).max(100000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const closeRecoverySchema = z.object({
  status: z.enum(["completed","cancelled"]),
});

// Get transport slabs (shown before transport request)
recoveryRouter.get("/transport/slabs", asyncHandler(async (_req, res) => {
  const slabs = await recoveryTransportService.getTransportSlabs();
  sendSuccess(res, slabs, "Transport slabs loaded");
}));

// Create recovery record
recoveryRouter.post("/", authenticate, requireRoles("ngo","govt","admin","hospital"), validateBody(recoverySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const record = await recoveryTransportService.createRecoveryFunding(req.user!, req.body);
  sendSuccess(res, record, "Recovery funding record created");
}));

// Get recovery records for a case
recoveryRouter.get("/case/:caseId", authenticate, validateParams(z.object({ caseId: z.string().uuid() })), asyncHandler(async (req, res) => {
  const records = await recoveryTransportService.listForCase(requiredParam(req.params, "caseId"));
  sendSuccess(res, records, "Recovery records loaded");
}));

// Close recovery
recoveryRouter.patch("/:id/close", authenticate, requireRoles("ngo","govt","admin","hospital"), validateParams(idP), validateBody(closeRecoverySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const record = await recoveryTransportService.closeRecovery(req.user!, requiredParam(req.params, "id"), req.body.status);
  sendSuccess(res, record, "Recovery record closed");
}));

export { adoptionRouter, csrRouter, recoveryRouter };
