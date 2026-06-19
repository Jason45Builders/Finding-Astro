import { Response } from "express";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedRequest, CaseType, CaseStatus } from "../../types/global.types";
import { requiredParam } from "../../utils/express.utils";
import { sendCreated, sendSuccess } from "../../utils/response";
import { caseService } from "./case.service";
import { query } from "../../config/db";

class CaseController {
  async createEmergencyCase(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor && !request.body.guestPhone) {
      throw new AppError("Provide a phone number so a responder can reach you.", 422, "REPORTER_REQUIRED");
    }
    const record = await caseService.createCase({
      ...request.body,
      caseType: "rescue",
      reporterUserId: actor?.id ?? null,
    });
    sendCreated(response, record, "Emergency alert sent — responders notified");
  }

  async createCase(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const record = await caseService.createCase({ ...request.body, reporterUserId: actor.id });
    sendCreated(response, record, "Case created");
  }

  async createAbuseReport(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const record = await caseService.createCase({ ...request.body, caseType: "abuse", reporterUserId: actor.id });
    sendCreated(response, record, "Abuse report filed — held for NGO review");
  }

  async listCases(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const cases = await caseService.listCases(
      {
        caseType:  typeof request.query.caseType === "string" ? request.query.caseType as CaseType : undefined,
        status:    typeof request.query.status === "string" ? request.query.status as CaseStatus : undefined,
        priority:  typeof request.query.priority === "string" ? request.query.priority : undefined,
        latitude:  request.query.latitude  ? Number(request.query.latitude)  : undefined,
        longitude: request.query.longitude ? Number(request.query.longitude) : undefined,
        radiusKm:  request.query.radiusKm  ? Number(request.query.radiusKm)  : undefined,
        limit:     request.query.limit     ? Number(request.query.limit)     : undefined,
      },
      actor
    );
    sendSuccess(response, cases, "Cases loaded", { count: cases.length });
  }

  async getCaseById(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const record = await caseService.getCaseForActor(requiredParam(request.params, "id"), actor);
    sendSuccess(response, record, "Case loaded");
  }

  async updateCase(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const record = await caseService.updateCase(requiredParam(request.params, "id"), request.body, actor);
    sendSuccess(response, record, "Case updated");
  }

  async issueVerdict(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    const caseRecord = await caseService.getCaseById(requiredParam(request.params, "id"));
    await query(
      `INSERT INTO report_verdicts (case_id, reporter_user_id, verdict, verdict_by, verdict_by_role, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [caseRecord.id, caseRecord.reporterUserId, request.body.verdict, actor.id, actor.role, request.body.notes ?? null]
    );
    sendSuccess(response, null, `Verdict "${request.body.verdict}" recorded`);
  }

  async releaseHeldCase(request: AuthenticatedRequest, response: Response): Promise<void> {
    const actor = request.user;
    if (!actor) throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    await query(
      `UPDATE cases SET held_for_review = FALSE, ngo_verified = TRUE,
       ngo_verified_by = $2, ngo_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [requiredParam(request.params, "id"), actor.id]
    );
    sendSuccess(response, null, "Case released — broadcasting to responders");
  }
}

export const caseController = new CaseController();
