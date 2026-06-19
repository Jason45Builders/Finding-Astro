/**
 * case.service.ts — FULLY FIXED
 * All bugs corrected directly in this file.
 */

import { AppError } from "../../middleware/error.middleware";
import {
  AuthenticatedUser, CaseRecord, CaseStatus, CaseType, UserRole,
} from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { userService } from "../users/user.service";
import { caseRepository, CaseCreateInput, CaseListFilters, CaseUpdateInput } from "./case.repository";
import { emergencyResponseService } from "./emergency-response.service";
import { query } from "../../config/db";
import { logger } from "../../utils/logger";

const PRIVILEGED_ROLES: UserRole[] = ["ngo", "govt", "admin"];

const buildVisibilityFilter = (actor: AuthenticatedUser): Partial<CaseListFilters> => {
  if (PRIVILEGED_ROLES.includes(actor.role)) return {};
  if (actor.role === "hospital") return { assignedToUserId: actor.id };
  return { reporterUserId: actor.id };
};

const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  open:                   ["in_review", "closed"],
  in_review:              ["action_taken", "resolved", "closed"],
  action_taken:           ["resolved", "closed"],
  resolved:               ["closed"],
  closed:                 [],
  VERIFIED_REIMBURSEMENT: ["resolved", "closed"],
};

const assertStatusTransition = (current: CaseStatus, next: CaseStatus, actor: AuthenticatedUser): void => {
  if (PRIVILEGED_ROLES.includes(actor.role)) return;
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new AppError(`Status cannot move from "${current}" to "${next}"`, 422, "INVALID_STATUS_TRANSITION");
  }
};

const REPORTER_STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  en_route:    { title: "Responder is on the way",  body: "Someone is heading to the animal's location right now." },
  on_scene:    { title: "Responder has arrived",     body: "The responder has reached the animal. Help is on site." },
  picked_up:   { title: "Animal has been picked up", body: "The animal is in safe hands and being taken to a clinic." },
  at_hospital: { title: "Animal is at the clinic",   body: "The animal has arrived at the veterinary clinic for treatment." },
  completed:   { title: "Case resolved",             body: "The animal is receiving care. Thank you for reporting." },
};

const buildAutoTitle = (caseType: string, animalType?: string, severity?: string): string => {
  const animal = animalType ?? "Animal";
  const sev = severity === "critical" ? "Critical" : severity === "serious" ? "Serious" : "Needs care";
  if (caseType === "rescue") return `${sev} — ${animal} needs help`;
  return `${caseType.replace(/_/g, " ")} case`;
};

class CaseService {
  async createCase(
    input: CaseCreateInput & { reporterUserId?: string | null; guestPhone?: string; severity?: string; animalType?: string }
  ): Promise<CaseRecord & { notifiedCount: number }> {

    const description = (input.description ?? "").trim() ||
      `${input.animalType ?? "Animal"} reported ${input.severity === "critical" ? "unresponsive" : "injured or distressed"}. Submitted via Finding Astro.`;

    const title = (input.title ?? "").trim().length >= 2
      ? input.title!.trim().slice(0, 160)
      : buildAutoTitle(input.caseType, input.animalType, input.severity);

    // Rescue and abuse are always HIGH — no exceptions
    const priority: "high" | "medium" | "low" =
      input.caseType === "rescue" ? "high" :
      input.caseType === "abuse"  ? "high" :
      input.priority              ?? "medium";

    const finalDescription = input.guestPhone
      ? `[Guest reporter: ${input.guestPhone}] ${description}`
      : description;

    let reporterUserId = input.reporterUserId ?? null;
    if (!reporterUserId && input.guestPhone) {
      reporterUserId = await this.getOrCreateGuestUser(input.guestPhone);
    }
    if (!reporterUserId) {
      throw new AppError("Reporter identity required — provide login or phone number", 422, "REPORTER_REQUIRED");
    }

    const caseRecord = await caseRepository.create({
      ...input,
      reporterUserId,
      title,
      description: finalDescription,
      priority,
    });

    await notificationService.notifyUser(
      reporterUserId, "case",
      "Emergency alert sent",
      `Your report "${title}" is live. Nearby responders are being notified.`,
      { caseId: caseRecord.id, caseType: caseRecord.caseType }
    );

    // Real notified count — not hardcoded
    let notifiedCount = 0;
    if (["rescue", "abuse"].includes(caseRecord.caseType)) {
      try {
        const result = await emergencyResponseService.broadcastEmergency(
          caseRecord.id, caseRecord.title, caseRecord.location,
          "high", reporterUserId, 1
        );
        notifiedCount = result.notifiedCount;
      } catch (err) {
        logger.error("Emergency broadcast failed after case creation", { caseId: caseRecord.id, err });
        // Non-fatal — case is created even if broadcast fails
      }
    }

    void userService.touchUserActivity(reporterUserId).catch(() => {});
    return { ...caseRecord, notifiedCount };
  }

  // FIXED: Atomic ON CONFLICT upsert — no race condition window
  private async getOrCreateGuestUser(phone: string): Promise<string> {
    const normalised = phone.replace(/\s+/g, "").replace(/^0/, "+91");
    const result = await query<{ id: string }>(
      `INSERT INTO users (phone, role, full_name, is_verified, created_at, updated_at)
       VALUES ($1, 'citizen', 'Guest Reporter', FALSE, NOW(), NOW())
       ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [normalised]
    );
    logger.info("Guest reporter resolved", { phone: normalised, userId: result.rows[0].id });
    return result.rows[0].id;
  }

  async updateCase(caseId: string, input: CaseUpdateInput, actor: AuthenticatedUser): Promise<CaseRecord> {
    const existing = await this.getCaseById(caseId);
    const canUpdate =
      PRIVILEGED_ROLES.includes(actor.role) ||
      existing.reporterUserId === actor.id ||
      existing.assignedToUserId === actor.id ||
      actor.role === "hospital";
    if (!canUpdate) throw new AppError("You do not have permission to update this case", 403, "FORBIDDEN");
    if (input.status && input.status !== existing.status) assertStatusTransition(existing.status, input.status, actor);
    if (input.status === "resolved" && !input.resolutionNotes && !existing.resolutionNotes) {
      throw new AppError("Resolution notes are required when marking a case resolved", 422, "RESOLUTION_NOTES_REQUIRED");
    }
    const updated = await caseRepository.update(caseId, input, actor.id);
    if (!updated) throw new AppError("Case not found", 404, "CASE_NOT_FOUND");
    if (input.status && input.status !== existing.status) {
      await notificationService.notifyUser(
        existing.reporterUserId, "case", "Case status updated",
        `Your case "${existing.title}" is now: ${input.status.replace(/_/g, " ")}.`,
        { caseId, fromStatus: existing.status, toStatus: input.status }
      );
    }
    if (input.assignedToUserId && input.assignedToUserId !== existing.assignedToUserId) {
      await notificationService.notifyUser(
        input.assignedToUserId, "case", "Case assigned to you",
        `You have been assigned to case "${existing.title}".`,
        { caseId, caseType: existing.caseType }
      );
    }
    return updated;
  }

  // Called by emergency-response.routes on every responder status update — notifies reporter
  async notifyReporterOfResponderUpdate(caseId: string, newStatus: string): Promise<void> {
    const meta = REPORTER_STATUS_MESSAGES[newStatus];
    if (!meta) return;
    const caseResult = await query<{ reporter_user_id: string; title: string }>(
      `SELECT reporter_user_id, title FROM cases WHERE id = $1`, [caseId]
    );
    const row = caseResult.rows[0];
    if (!row) return;
    await notificationService.notifyUser(
      row.reporter_user_id, "case", meta.title,
      `${meta.body} (Case: "${row.title}")`,
      { caseId, responderStatus: newStatus }
    );
    const tsField: string = {
      en_route: "mins_to_first_claim", on_scene: "mins_to_first_claim",
      picked_up: "mins_to_pickup", at_hospital: "mins_to_clinic", completed: "mins_to_resolution",
    }[newStatus] ?? "";
    if (tsField) {
      await query(
        `UPDATE case_time_tracking SET ${tsField} = EXTRACT(EPOCH FROM (NOW() - reported_at))/60, updated_at = NOW() WHERE case_id = $1`,
        [caseId]
      ).catch(() => {});
    }
  }

  async listCases(filters: CaseListFilters, actor: AuthenticatedUser): Promise<CaseRecord[]> {
    return caseRepository.list({ ...filters, ...buildVisibilityFilter(actor) });
  }

  async getCaseById(caseId: string): Promise<CaseRecord> {
    const record = await caseRepository.findById(caseId);
    if (!record) throw new AppError("Case not found", 404, "CASE_NOT_FOUND");
    return record;
  }

  async getCaseForActor(caseId: string, actor: AuthenticatedUser): Promise<CaseRecord> {
    const record = await this.getCaseById(caseId);
    if (PRIVILEGED_ROLES.includes(actor.role)) return record;
    if (actor.role === "hospital" && record.assignedToUserId === actor.id) return record;
    if (record.reporterUserId === actor.id) return record;
    throw new AppError("You do not have access to this case", 403, "FORBIDDEN");
  }

  async appendEvidenceUrls(caseId: string, urls: string[], actor: AuthenticatedUser): Promise<CaseRecord> {
    const existing = await this.getCaseById(caseId);
    const merged = Array.from(new Set([...existing.evidenceUrls, ...urls.filter(Boolean)]));
    const updated = await caseRepository.update(caseId, { evidenceUrls: merged }, actor.id);
    if (!updated) throw new AppError("Case not found", 404, "CASE_NOT_FOUND");
    return updated;
  }

  async countNearbyRecentCases(
    caseType: CaseType, location: { latitude: number; longitude: number },
    radiusKm: number, lookbackDays: number
  ): Promise<number> {
    return caseRepository.countNearbyRecentCases(caseType, location, radiusKm, lookbackDays);
  }
}

export const caseService = new CaseService();
