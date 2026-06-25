import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { query } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest, UserRole } from "../../types/global.types";
import { requiredParam } from "../../utils/express.utils";
import { fundingService } from "../funding/funding.service";
import { adminService, AdminPartner } from "./admin.service";

const router = Router();

const idParams = z.object({ id: z.string().uuid() });
const assignCaseSchema = z.object({ responderId: z.string().uuid() });
const partnerType = z.enum(["clinic", "store", "ngo", "helpline", "abc_centre", "wildlife_centre"]).optional();
const userRoleSchema = z.enum(["citizen", "ngo", "govt", "admin", "hospital"]);

const educationSchema = z.object({
  topicKey: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  audience: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(2000),
  actionPoints: z.array(z.string().trim()).default([]),
  triggerCaseType: z.enum(["rescue", "abuse", "conflict", "lost_pet", "abc"]).nullable().optional(),
  triggerAnimalStatus: z.enum(["community", "lost", "found", "reunited", "adopted"]).nullable().optional(),
  languageCode: z.string().trim().min(2).max(20).default("en"),
});

const behaviourSchema = z.object({
  situationType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  doItems: z.array(z.string().trim()).default([]),
  dontItems: z.array(z.string().trim()).default([]),
  audience: z.string().trim().nullable().optional(),
  category: z.string().trim().optional(),
  published: z.boolean().default(true),
});

const helplineSchema = z.object({
  name: z.string().trim().min(1).max(160),
  number: z.string().trim().min(5).max(40),
  area: z.string().trim().nullable().optional(),
  availableHours: z.string().trim().nullable().optional(),
});

const actor = (request: AuthenticatedRequest): AuthenticatedRequest["user"] => {
  if (!request.user) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  return request.user;
};

router.use(authenticate, requireRoles("admin"));

router.get("/responders", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const responders = await adminService.listResponders(request.query.limit as number | undefined);
  sendSuccess(response, responders, "Responders loaded", { count: responders.length });
}));

router.post("/cases/:id/assign", validateParams(idParams), validateBody(assignCaseSchema), asyncHandler(async (request, response) => {
  const assigned = await adminService.assignCase(actor(request)!, requiredParam(request.params, "id"), request.body.responderId);
  sendSuccess(response, assigned, "Case assigned");
}));

router.get("/funding", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const funding = await adminService.listFundingCases(request.query.limit as number | undefined);
  sendSuccess(response, funding, "Funding cases loaded", { count: funding.length });
}));

router.get("/funding/:id/transactions", validateParams(idParams), asyncHandler(async (request, response) => {
  const transactions = await adminService.listFundingTransactions(requiredParam(request.params, "id"));
  sendSuccess(response, transactions, "Funding transactions loaded", { count: transactions.length });
}));

router.get("/funding/reimbursements", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const reimbursements = await adminService.listReimbursements(request.query.limit as number | undefined);
  sendSuccess(response, reimbursements, "Reimbursements loaded", { count: reimbursements.length });
}));

router.post("/funding/:id/release-payout", validateParams(idParams), asyncHandler(async (_request, response) => {
  const released = await fundingService.releasePayout(actor(_request)!, { fundingCaseId: requiredParam(_request.params, "id") });
  sendSuccess(response, released, "Payout released");
}));

router.get("/partners", validateQuery(z.object({ type: partnerType, limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const type = typeof request.query.type === "string" ? request.query.type as AdminPartner["type"] : undefined;
  const partners = await adminService.listPartners(type, request.query.limit as number | undefined);
  sendSuccess(response, partners, "Partners loaded", { count: partners.length });
}));

router.post("/partners/:id/verify", validateParams(idParams), validateBody(z.object({ status: z.enum(["approved", "rejected"]) })), asyncHandler(async (request, response) => {
  const partnerId = requiredParam(request.params, "id");
  const approved = request.body.status === "approved";
  await Promise.all([
    query(`UPDATE partner_clinics SET is_verified = $2 WHERE id = $1`, [partnerId, approved]),
    query(`UPDATE partner_stores SET is_verified = $2 WHERE id = $1`, [partnerId, approved]),
    query(`UPDATE welfare_orgs SET is_verified = $2 WHERE id = $1`, [partnerId, approved]),
    query(`UPDATE abc_centres SET is_verified = $2 WHERE id = $1`, [partnerId, approved]),
    query(`UPDATE wildlife_centers SET is_24hr = $2 WHERE id = $1`, [partnerId, approved])
  ]);
  const partners = await adminService.listPartners(undefined, 1000);
  const partner = partners.find((item) => item.id === partnerId);
  if (!partner) throw new AppError("Partner not found", 404, "PARTNER_NOT_FOUND");
  sendSuccess(response, partner, request.body.status === "approved" ? "Partner approved" : "Partner verification revoked");
}));

router.get("/users", asyncHandler(async (request, response) => {
  const { userService } = await import("../users/user.service");
  const users = await userService.listUsers();
  sendSuccess(response, users, "Users loaded", { count: users.length });
}));

router.post("/users/:id/ban", validateParams(idParams), validateBody(z.object({ ban: z.boolean() })), asyncHandler(async (request, response) => {
  await adminService.banUser(requiredParam(request.params, "id"), request.body.ban);
  const { userService } = await import("../users/user.service");
  const user = await userService.getUserById(requiredParam(request.params, "id"));
  sendSuccess(response, user, request.body.ban ? "User banned" : "User unbanned");
}));

router.patch("/users/:id/role", validateParams(idParams), validateBody(z.object({ role: userRoleSchema })), asyncHandler(async (request, response) => {
  await adminService.updateRole(requiredParam(request.params, "id"), request.body.role as UserRole);
  const { userService } = await import("../users/user.service");
  const user = await userService.getUserById(requiredParam(request.params, "id"));
  sendSuccess(response, user, "User role updated");
}));

router.post("/users/:id/verify-identity", validateParams(idParams), validateBody(z.object({ verified: z.boolean() })), asyncHandler(async (request, response) => {
  await adminService.verifyIdentity(requiredParam(request.params, "id"), request.body.verified);
  const { userService } = await import("../users/user.service");
  const user = await userService.getUserById(requiredParam(request.params, "id"));
  sendSuccess(response, user, request.body.verified ? "Identity verified" : "Identity verification revoked");
}));

router.get("/wards/summary", asyncHandler(async (_request, response) => {
  const wards = await adminService.listWardSummaries();
  sendSuccess(response, wards, "Ward summaries loaded", { count: wards.length });
}));

router.get("/content/education", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const content = await adminService.listEducationContent(request.query.limit as number | undefined);
  sendSuccess(response, content, "Education content loaded", { count: content.length });
}));

router.post("/content/education", validateBody(educationSchema), asyncHandler(async (request, response) => {
  const content = await adminService.createEducationContent(request.body);
  sendSuccess(response, content, "Education content created");
}));

router.patch("/content/education/:id", validateParams(idParams), validateBody(educationSchema.partial()), asyncHandler(async (request, response) => {
  const content = await adminService.updateEducationContent(requiredParam(request.params, "id"), request.body);
  sendSuccess(response, content, "Education content updated");
}));

router.delete("/content/education/:id", validateParams(idParams), asyncHandler(async (request, response) => {
  await adminService.deleteEducationContent(requiredParam(request.params, "id"));
  sendSuccess(response, null, "Education content deleted");
}));

router.get("/content/behaviour", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const content = await adminService.listBehaviourGuidance(request.query.limit as number | undefined);
  sendSuccess(response, content, "Behaviour guidance loaded", { count: content.length });
}));

router.post("/content/behaviour", validateBody(behaviourSchema), asyncHandler(async (request, response) => {
  const content = await adminService.createBehaviourGuidance(request.body);
  sendSuccess(response, content, "Behaviour guidance created");
}));

router.patch("/content/behaviour/:id", validateParams(idParams), validateBody(behaviourSchema.partial()), asyncHandler(async (request, response) => {
  const content = await adminService.updateBehaviourGuidance(requiredParam(request.params, "id"), request.body);
  sendSuccess(response, content, "Behaviour guidance updated");
}));

router.delete("/content/behaviour/:id", validateParams(idParams), asyncHandler(async (request, response) => {
  await adminService.deleteBehaviourGuidance(requiredParam(request.params, "id"));
  sendSuccess(response, null, "Behaviour guidance disabled");
}));

router.get("/content/helplines", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(500).optional() })), asyncHandler(async (request, response) => {
  const helplines = await adminService.listHelplines(request.query.limit as number | undefined);
  sendSuccess(response, helplines, "Helplines loaded", { count: helplines.length });
}));

router.post("/content/helplines", validateBody(helplineSchema), asyncHandler(async (request, response) => {
  const helpline = await adminService.createHelpline(request.body);
  sendSuccess(response, helpline, "Helpline created");
}));

router.patch("/content/helplines/:id", validateParams(idParams), validateBody(helplineSchema.partial()), asyncHandler(async (request, response) => {
  const helpline = await adminService.updateHelpline(requiredParam(request.params, "id"), request.body);
  sendSuccess(response, helpline, "Helpline updated");
}));

router.delete("/content/helplines/:id", validateParams(idParams), asyncHandler(async (request, response) => {
  await adminService.deleteHelpline(requiredParam(request.params, "id"));
  sendSuccess(response, null, "Helpline disabled");
}));

router.get("/dashboard/alerts", validateQuery(z.object({ limit: z.coerce.number().int().positive().max(100).optional() })), asyncHandler(async (request, response) => {
  const alerts = await adminService.listAlerts(request.query.limit as number | undefined);
  sendSuccess(response, alerts, "Alerts loaded", { count: alerts.length });
}));

router.get("/dashboard/monthly-cases", asyncHandler(async (_request, response) => {
  const cases = await adminService.monthlyResolvedCases();
  sendSuccess(response, cases, "Monthly case trends loaded", { count: cases.length });
}));

export default router;
