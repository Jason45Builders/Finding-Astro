/**
 * safety.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Safety & Coexistence System + Community Zone System + QR Code System
 *
 * PDF: "Reduces fear → reduces conflict"
 * "Safety & coexistence is not about removing dogs. It's about education."
 *
 * Features:
 *   1. "I feel unsafe" mode — not "Report dog", instead "Report situation"
 *   2. Instant behaviour guidance cards (contextual, shown before case creation)
 *   3. Safe awareness zones — "Dogs here are monitored"
 *   4. QR code system — physical signage → digital animal record
 *   5. Community zone ABC coverage tracking
 *   6. Trust signals — visible outcomes ("Dog rescued 2 hours ago")
 *
 * PLACE AT: backend/src/modules/cases/safety.service.ts
 */

import crypto from "node:crypto";
import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser, LocationInput } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { logger } from "../../utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BehaviourGuidanceCard {
  id: string; situationType: string; title: string; content: string;
  doItems: string[]; dontItems: string[]; audience: string;
}

export interface SafetyReport {
  id: string; reporterUserId: string; situationType: string; description: string;
  location: LocationInput; locationText: string | null; severity: string;
  animalId: string | null; guidanceShown: string[]; referredToCaseId: string | null;
  resolved: boolean; createdAt: Date;
}

export interface SafeAwarenessZone {
  id: string; zoneName: string; wardName: string | null; zoneType: string;
  location: LocationInput; radiusMetres: number;
  animalCount: number; abcCoveragePct: number; vaccinationPct: number;
  caretakerUserId: string | null; qrCodeId: string | null; isActive: boolean;
}

export interface QrCode {
  id: string; code: string; qrType: string;
  linkedAnimalId: string | null; linkedZoneId: string | null; linkedCaseId: string | null;
  location: LocationInput | null; locationText: string | null;
  displayLabel: string | null; scanCount: number; isActive: boolean;
}

export interface PublicOutcome {
  id: string; caseId: string | null; animalId: string | null;
  outcomeType: string; headline: string; detail: string | null;
  locationText: string | null; wardName: string | null; occurredAt: Date;
}

export interface WardAnimalSummary {
  wardName: string; totalAnimals: number; sterilisedCount: number;
  vaccinatedCount: number; lostCount: number; openCases: number;
  resolvedCases30d: number; abcCoveragePct: number; lastActivityAt: Date | null;
}

class SafetyService {

  // ── BEHAVIOUR GUIDANCE — shown contextually before case creation ──────────
  async getGuidanceForSituation(situationType: string): Promise<BehaviourGuidanceCard[]> {
    const result = await query<{
      id: string; situation_type: string; title: string; content: string;
      do_items: string[]; dont_items: string[]; audience: string;
    }>(
      `SELECT * FROM behaviour_guidance_cards WHERE situation_type = $1 AND is_active = TRUE ORDER BY display_order`,
      [situationType]
    );
    return result.rows.map(r => ({
      id: r.id, situationType: r.situation_type, title: r.title, content: r.content,
      doItems: r.do_items, dontItems: r.dont_items, audience: r.audience,
    }));
  }

  async getAllGuidance(): Promise<BehaviourGuidanceCard[]> {
    const result = await query<{
      id: string; situation_type: string; title: string; content: string;
      do_items: string[]; dont_items: string[]; audience: string;
    }>(`SELECT * FROM behaviour_guidance_cards WHERE is_active = TRUE ORDER BY situation_type, display_order`);
    return result.rows.map(r => ({
      id: r.id, situationType: r.situation_type, title: r.title, content: r.content,
      doItems: r.do_items, dontItems: r.dont_items, audience: r.audience,
    }));
  }

  // ── SAFETY REPORT — "I feel unsafe" (not "report dog") ───────────────────
  async reportSafetyСoncern(
    actor: AuthenticatedUser,
    input: {
      situationType: "feel_unsafe" | "aggression_concern" | "bite_incident" | "pack_concern" | "child_safety";
      description: string;
      location: LocationInput;
      locationText?: string | null;
      severity?: "low" | "medium" | "high";
      animalId?: string | null;
    }
  ): Promise<{ report: SafetyReport; guidance: BehaviourGuidanceCard[]; humaneResponse: string }> {

    // Get contextual guidance first
    const guidance = await this.getGuidanceForSituation(input.situationType);
    const guidanceShown = guidance.map(g => g.id);

    const result = await query<{
      id: string; reporter_user_id: string; situation_type: string; description: string;
      latitude: number; longitude: number; location_text: string | null; severity: string;
      animal_id: string | null; guidance_shown: string[]; referred_to_case_id: string | null;
      resolved: boolean; created_at: Date;
    }>(
      `
        INSERT INTO safety_reports (reporter_user_id, situation_type, description, location, location_text, severity, animal_id, guidance_shown)
        VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, $7, $8, $9)
        RETURNING id, reporter_user_id, situation_type, description,
          ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude,
          location_text, severity, animal_id, guidance_shown, referred_to_case_id, resolved, created_at
      `,
      [
        actor.id, input.situationType, input.description,
        input.location.longitude, input.location.latitude,
        input.locationText ?? null, input.severity ?? "medium",
        input.animalId ?? null, guidanceShown,
      ]
    );

    const r = result.rows[0];
    const report: SafetyReport = {
      id: r.id, reporterUserId: r.reporter_user_id, situationType: r.situation_type,
      description: r.description, location: { latitude: Number(r.latitude), longitude: Number(r.longitude) },
      locationText: r.location_text, severity: r.severity, animalId: r.animal_id,
      guidanceShown: r.guidance_shown, referredToCaseId: r.referred_to_case_id,
      resolved: r.resolved, createdAt: r.created_at,
    };

    // Build a humane, non-alarming response
    const humaneResponses: Record<string, string> = {
      feel_unsafe: "Your concern has been noted. Nearby caretakers and animal welfare volunteers have been alerted. The guidance above will help you stay safe.",
      aggression_concern: "This has been logged. A volunteer familiar with this area will be notified. If the dog shows signs of illness, we will escalate to a rescue case.",
      bite_incident: "Please seek medical attention immediately. This case has been flagged for urgent follow-up. Wash the wound thoroughly right now.",
      pack_concern: "Pack behaviour is usually territorial. This area has been flagged for a welfare check. Your location note helps caretakers understand the territory.",
      child_safety: "Thank you for flagging this. Community awareness is the best protection. A welfare volunteer will check in on the area.",
    };

    // Notify nearby NGOs/caretakers for high severity concerns
    if ((input.severity ?? "medium") === "high" || input.situationType === "bite_incident") {
      await notificationService.notifyUsersNearLocation(
        input.location, 5, [actor.id], "case",
        "Safety concern reported nearby",
        `A ${input.situationType.replace(/_/g, " ")} has been reported. Welfare check may be needed.`,
        { safetyReportId: report.id, situationType: input.situationType }
      );
    }

    logger.info("Safety concern logged", { reportId: report.id, type: input.situationType });

    return {
      report,
      guidance,
      humaneResponse: humaneResponses[input.situationType] ?? "Your concern has been recorded and will be reviewed.",
    };
  }

  // ── SAFE ZONES — Area-level monitoring status ─────────────────────────────
  async listSafeZones(location?: LocationInput, radiusKm = 10): Promise<SafeAwarenessZone[]> {
    const conditions = ["sz.is_active = TRUE"];
    const vals: unknown[] = [];

    if (location) {
      vals.push(location.longitude); const li = vals.length;
      vals.push(location.latitude);  const lai = vals.length;
      vals.push(radiusKm * 1000);    const ri = vals.length;
      conditions.push(`ST_DWithin(sz.location, ST_SetSRID(ST_MakePoint($${li}, $${lai}), 4326)::geography, $${ri})`);
    }

    const result = await query<{
      id: string; zone_name: string; ward_name: string | null; zone_type: string;
      latitude: number; longitude: number; radius_metres: number;
      animal_count: number; abc_coverage_pct: number; vaccination_pct: number;
      caretaker_user_id: string | null; qr_code_id: string | null;
    }>(
      `SELECT sz.id, sz.zone_name, sz.ward_name, sz.zone_type,
              ST_Y(sz.location::geometry) AS latitude, ST_X(sz.location::geometry) AS longitude,
              sz.radius_metres, sz.animal_count, sz.abc_coverage_pct, sz.vaccination_pct,
              sz.caretaker_user_id, sz.qr_code_id
       FROM safe_awareness_zones sz WHERE ${conditions.join(" AND ")} ORDER BY sz.zone_name`,
      vals
    );

    return result.rows.map(r => ({
      id: r.id, zoneName: r.zone_name, wardName: r.ward_name, zoneType: r.zone_type,
      location: { latitude: Number(r.latitude), longitude: Number(r.longitude) },
      radiusMetres: r.radius_metres, animalCount: r.animal_count,
      abcCoveragePct: r.abc_coverage_pct, vaccinationPct: r.vaccination_pct,
      caretakerUserId: r.caretaker_user_id, qrCodeId: r.qr_code_id, isActive: true,
    }));
  }

  // ── QR CODE SYSTEM ────────────────────────────────────────────────────────

  // Generate a new QR code for an animal or zone
  async generateQrCode(
    actor: AuthenticatedUser,
    input: {
      qrType: "animal" | "zone" | "feeding_point" | "case" | "abc_status";
      linkedAnimalId?: string | null;
      linkedZoneId?: string | null;
      linkedCaseId?: string | null;
      location?: LocationInput | null;
      locationText?: string | null;
      displayLabel?: string | null;
    }
  ): Promise<QrCode & { deepLinkUrl: string; printableLabel: string }> {
    if (!["ngo","govt","admin"].includes(actor.role)) {
      throw new AppError("Only NGOs and admins can generate QR codes", 403, "FORBIDDEN");
    }

    const result = await query<{
      id: string; code: string; qr_type: string;
      linked_animal_id: string | null; linked_zone_id: string | null; linked_case_id: string | null;
      latitude: number | null; longitude: number | null; location_text: string | null;
      display_label: string | null; scan_count: number; is_active: boolean;
    }>(
      `
        INSERT INTO qr_codes (qr_type, linked_animal_id, linked_zone_id, linked_case_id,
          location, location_text, display_label, created_by_user_id)
        VALUES ($1, $2, $3, $4,
          CASE WHEN $5::float IS NOT NULL AND $6::float IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography ELSE NULL END,
          $7, $8, $9)
        RETURNING id, code, qr_type, linked_animal_id, linked_zone_id, linked_case_id,
          ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude,
          location_text, display_label, scan_count, is_active
      `,
      [
        input.qrType,
        input.linkedAnimalId ?? null, input.linkedZoneId ?? null, input.linkedCaseId ?? null,
        input.location?.longitude ?? null, input.location?.latitude ?? null,
        input.locationText ?? null, input.displayLabel ?? null, actor.id,
      ]
    );

    const r = result.rows[0];
    const qrCode: QrCode = {
      id: r.id, code: r.code, qrType: r.qr_type,
      linkedAnimalId: r.linked_animal_id, linkedZoneId: r.linked_zone_id, linkedCaseId: r.linked_case_id,
      location: r.latitude && r.longitude ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : null,
      locationText: r.location_text, displayLabel: r.display_label,
      scanCount: r.scan_count, isActive: r.is_active,
    };

    const deepLinkUrl = `https://findingastro.app/qr/${r.code}`;
    const printableLabel = input.displayLabel ?? (
      input.qrType === "animal" ? "Scan to see this animal's health record & history" :
      input.qrType === "zone"   ? "Dogs in this area are monitored & vaccinated" :
                                   "Scan to report a concern or see area status"
    );

    logger.info("QR code generated", { qrCodeId: r.id, type: input.qrType, actorId: actor.id });
    return { ...qrCode, deepLinkUrl, printableLabel };
  }

  // Resolve what a QR scan should show (called when user scans a code)
  async resolveQrScan(
    code: string,
    scannedByUserId?: string | null,
    scanLocation?: LocationInput | null
  ): Promise<{ qrCode: QrCode; resolvedType: string; data: Record<string, unknown> }> {
    const result = await query<{
      id: string; code: string; qr_type: string;
      linked_animal_id: string | null; linked_zone_id: string | null; linked_case_id: string | null;
      latitude: number | null; longitude: number | null; location_text: string | null;
      display_label: string | null; scan_count: number; is_active: boolean;
    }>(
      `UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = NOW()
       WHERE code = $1 AND is_active = TRUE
       RETURNING id, code, qr_type, linked_animal_id, linked_zone_id, linked_case_id,
         ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude,
         location_text, display_label, scan_count, is_active`,
      [code]
    );

    if (!result.rows[0]) throw new AppError("QR code not found or inactive", 404, "QR_NOT_FOUND");

    const r = result.rows[0];

    // Log the scan
    await query(
      `INSERT INTO qr_scan_logs (qr_code_id, scanned_by_user_id, location)
       VALUES ($1, $2, CASE WHEN $3::float IS NOT NULL THEN ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography ELSE NULL END)`,
      [r.id, scannedByUserId ?? null, scanLocation?.longitude ?? null, scanLocation?.latitude ?? null]
    );

    const qrCode: QrCode = {
      id: r.id, code: r.code, qrType: r.qr_type,
      linkedAnimalId: r.linked_animal_id, linkedZoneId: r.linked_zone_id, linkedCaseId: r.linked_case_id,
      location: r.latitude && r.longitude ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : null,
      locationText: r.location_text, displayLabel: r.display_label,
      scanCount: r.scan_count, isActive: r.is_active,
    };

    // Build resolved data based on type
    const data: Record<string, unknown> = {
      message: r.display_label ?? "Scan recognised",
      qrType: r.qr_type,
    };

    if (r.linked_animal_id) data.animalId = r.linked_animal_id;
    if (r.linked_zone_id)   data.zoneId   = r.linked_zone_id;
    if (r.linked_case_id)   data.caseId   = r.linked_case_id;

    return { qrCode, resolvedType: r.qr_type, data };
  }

  // ── TRUST SIGNALS — Recent visible outcomes ───────────────────────────────
  async getRecentOutcomes(wardName?: string, limit = 10): Promise<PublicOutcome[]> {
    const conditions = ["po.is_public = TRUE"];
    const vals: unknown[] = [];
    if (wardName) { vals.push(wardName); conditions.push(`po.ward_name = $${vals.length}`); }
    vals.push(limit);
    const result = await query<{
      id: string; case_id: string | null; animal_id: string | null; outcome_type: string;
      headline: string; detail: string | null; location_text: string | null;
      ward_name: string | null; occurred_at: Date;
    }>(
      `SELECT * FROM public_outcomes po WHERE ${conditions.join(" AND ")} ORDER BY occurred_at DESC LIMIT $${vals.length}`,
      vals
    );
    return result.rows.map(r => ({
      id: r.id, caseId: r.case_id, animalId: r.animal_id, outcomeType: r.outcome_type,
      headline: r.headline, detail: r.detail, locationText: r.location_text,
      wardName: r.ward_name, occurredAt: r.occurred_at,
    }));
  }

  // ── WARD SUMMARY — Community zone ABC coverage ────────────────────────────
  async getWardSummary(wardName?: string): Promise<WardAnimalSummary[]> {
    const result = await query<{
      ward_name: string; total_animals: number; sterilised_count: number;
      vaccinated_count: number; lost_count: number; open_cases: number;
      resolved_cases_30d: number; abc_coverage_pct: number; last_activity_at: Date | null;
    }>(
      wardName
        ? `SELECT * FROM ward_animal_summary WHERE ward_name = $1`
        : `SELECT * FROM ward_animal_summary ORDER BY total_animals DESC LIMIT 50`,
      wardName ? [wardName] : []
    );
    return result.rows.map(r => ({
      wardName: r.ward_name, totalAnimals: r.total_animals, sterilisedCount: r.sterilised_count,
      vaccinatedCount: r.vaccinated_count, lostCount: r.lost_count, openCases: r.open_cases,
      resolvedCases30d: r.resolved_cases_30d, abcCoveragePct: r.abc_coverage_pct,
      lastActivityAt: r.last_activity_at,
    }));
  }

  // ── TIME TO ACTION — Platform performance metrics ─────────────────────────
  async getResponseMetrics(wardName?: string): Promise<{
    avgMinsToFirstClaim: number | null;
    avgMinsToPickup: number | null;
    avgMinsToClinic: number | null;
    totalCasesTracked: number;
    casesRespondedWithin15Mins: number;
  }> {
    const result = await query<{
      avg_to_claim: number | null; avg_to_pickup: number | null; avg_to_clinic: number | null;
      total: number; within_15: number;
    }>(
      `
        SELECT
          ROUND(AVG(tt.mins_to_first_claim))  AS avg_to_claim,
          ROUND(AVG(tt.mins_to_pickup))        AS avg_to_pickup,
          ROUND(AVG(tt.mins_to_clinic))        AS avg_to_clinic,
          COUNT(*)::int                         AS total,
          COUNT(*) FILTER (WHERE tt.mins_to_first_claim <= 15)::int AS within_15
        FROM case_time_tracking tt
        JOIN cases c ON c.id = tt.case_id
        WHERE tt.mins_to_first_claim IS NOT NULL
          AND c.created_at > NOW() - INTERVAL '30 days'
      `
    );
    const r = result.rows[0];
    return {
      avgMinsToFirstClaim: r.avg_to_claim !== null ? Number(r.avg_to_claim) : null,
      avgMinsToPickup:     r.avg_to_pickup !== null ? Number(r.avg_to_pickup) : null,
      avgMinsToClinic:     r.avg_to_clinic !== null ? Number(r.avg_to_clinic) : null,
      totalCasesTracked:   r.total,
      casesRespondedWithin15Mins: r.within_15,
    };
  }
}

export const safetyService = new SafetyService();
