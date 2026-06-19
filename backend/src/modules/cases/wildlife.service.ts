/**
 * wildlife.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete wildlife rescue system — entirely separate from pet/stray flow.
 *
 * PDF principle: "Do not crowd, do not handle, do not mis-route."
 * Route to authorized wildlife responders ONLY. Never general volunteers.
 * Show public guidance INSTANTLY on report.
 *
 * Flow: Report → Classify → Public guidance shown → Wildlife responders notified
 *       → Claim → Secure → Wildlife center (NOT local vet) → Rehab/Release → Close
 *
 * PLACE AT: backend/src/modules/cases/wildlife.service.ts
 */

import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser, CaseRecord, LocationInput } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { logger } from "../../utils/logger";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WildlifeSpeciesCategory {
  id: string; name: string; displayName: string; handlingRisk: string;
  publicGuidance: string; doNotDo: string; isActive: boolean;
}

export interface WildlifeCenter {
  id: string; name: string; phone: string; address: string | null;
  location: LocationInput | null; acceptedSpecies: string[];
  operatingHours: string | null; is24hr: boolean; city: string | null;
  distanceKm?: number;
}

export interface WildlifeReportInput {
  reporterUserId: string;
  speciesCategory: string;       // "snake" | "bird" | "monkey" | "reptile" | "mammal" | "other"
  condition: "injured" | "trapped" | "in_building" | "sighted_only" | "unknown";
  description: string;
  location: LocationInput;
  locationText?: string | null;
  photoUrls?: string[];
}

export interface WildlifeReportResult {
  caseRecord: CaseRecord;
  guidance: { publicGuidance: string; doNotDo: string; displayName: string };
  nearestCenters: WildlifeCenter[];
}

interface SpeciesRow {
  id: string; name: string; display_name: string; handling_risk: string;
  public_guidance: string; do_not_do: string; is_active: boolean;
}

interface CenterRow {
  id: string; name: string; phone: string; address: string | null;
  latitude: number | null; longitude: number | null;
  accepted_species: string[]; operating_hours: string | null;
  is_24hr: boolean; city: string | null; distance_km: number | null;
}

interface CaseRow {
  id: string; animal_id: string | null; reporter_user_id: string; assigned_to_user_id: string | null;
  case_type: string; status: string; priority: string; title: string; description: string;
  location_text: string | null; latitude: number; longitude: number;
  evidence_urls: string[] | null; resolution_notes: string | null;
  created_at: Date; updated_at: Date;
}

const mapCase = (r: CaseRow): CaseRecord => ({
  id: r.id, animalId: r.animal_id, reporterUserId: r.reporter_user_id,
  assignedToUserId: r.assigned_to_user_id, caseType: r.case_type as CaseRecord["caseType"],
  status: r.status as CaseRecord["status"], priority: r.priority,
  title: r.title, description: r.description, locationText: r.location_text,
  location: { latitude: Number(r.latitude), longitude: Number(r.longitude) },
  evidenceUrls: r.evidence_urls ?? [], resolutionNotes: r.resolution_notes,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

class WildlifeService {

  // ── Get guidance for a species (shown before case is even created) ─────────
  async getSpeciesGuidance(speciesName: string): Promise<WildlifeSpeciesCategory> {
    const result = await query<SpeciesRow>(
      `SELECT * FROM wildlife_species_categories WHERE name = $1 AND is_active = TRUE LIMIT 1`,
      [speciesName]
    );
    const row = result.rows[0];
    if (!row) {
      // Return "other" as fallback
      const fallback = await query<SpeciesRow>(
        `SELECT * FROM wildlife_species_categories WHERE name = 'other' LIMIT 1`
      );
      if (!fallback.rows[0]) throw new AppError("Species guidance not found", 404, "NOT_FOUND");
      return this.mapSpecies(fallback.rows[0]);
    }
    return this.mapSpecies(row);
  }

  private mapSpecies(r: SpeciesRow): WildlifeSpeciesCategory {
    return { id: r.id, name: r.name, displayName: r.display_name,
             handlingRisk: r.handling_risk, publicGuidance: r.public_guidance,
             doNotDo: r.do_not_do, isActive: r.is_active };
  }

  // ── Find nearest wildlife centers that accept this species ────────────────
  async findNearestCenters(location: LocationInput, speciesName: string, radiusKm = 100): Promise<WildlifeCenter[]> {
    const result = await query<CenterRow>(
      `
        SELECT
          wc.id, wc.name, wc.phone, wc.address,
          ST_Y(wc.location::geometry) AS latitude,
          ST_X(wc.location::geometry) AS longitude,
          wc.accepted_species, wc.operating_hours, wc.is_24hr, wc.city,
          CASE WHEN wc.location IS NOT NULL
            THEN ST_Distance(wc.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000
            ELSE NULL
          END AS distance_km
        FROM wildlife_centers wc
        WHERE wc.is_active = TRUE
          AND ($3 = ANY(wc.accepted_species) OR 'other' = ANY(wc.accepted_species))
          AND (wc.location IS NULL OR
               ST_DWithin(wc.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $4))
        ORDER BY distance_km NULLS LAST
        LIMIT 5
      `,
      [location.longitude, location.latitude, speciesName, radiusKm * 1000]
    );

    return result.rows.map(r => ({
      id: r.id, name: r.name, phone: r.phone, address: r.address,
      location: r.latitude && r.longitude ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : null,
      acceptedSpecies: r.accepted_species, operatingHours: r.operating_hours,
      is24hr: r.is_24hr, city: r.city,
      distanceKm: r.distance_km !== null ? Number(r.distance_km) : undefined,
    }));
  }

  // ── Create a wildlife rescue case ─────────────────────────────────────────
  async reportWildlife(input: WildlifeReportInput): Promise<WildlifeReportResult> {
    // Fetch guidance first — shown to user immediately
    const guidance = await this.getSpeciesGuidance(input.speciesCategory);

    const priority = input.condition === "injured" || input.condition === "trapped" ? "high" : "medium";
    const title = `Wildlife rescue — ${guidance.displayName} (${input.condition.replace(/_/g, " ")})`;

    return withTransaction(async (client) => {
      const result = await client.query<CaseRow>(
        `
          INSERT INTO cases (
            reporter_user_id, case_type, status, priority,
            title, description, location_text, location, evidence_urls,
            wildlife_species_category, wildlife_condition, public_guidance_shown
          )
          VALUES ($1, 'wildlife', 'open', $2, $3, $4, $5,
            ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9, $10, TRUE)
          RETURNING
            id, animal_id, reporter_user_id, assigned_to_user_id, case_type, status, priority,
            title, description, location_text,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            evidence_urls, resolution_notes, created_at, updated_at
        `,
        [
          input.reporterUserId, priority, title, input.description,
          input.locationText ?? null,
          input.location.longitude, input.location.latitude,
          input.photoUrls ?? [],
          input.speciesCategory, input.condition,
        ]
      );

      const caseRecord = mapCase(result.rows[0]);

      // Write audit event
      await client.query(
        `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
         VALUES ($1, $2, NULL, 'open', 'Wildlife rescue case created')`,
        [caseRecord.id, input.reporterUserId]
      );

      // Notify reporter with guidance
      await notificationService.notifyUser(
        input.reporterUserId, "case",
        "Wildlife rescue case filed",
        `Authorised responders are being notified. ${guidance.publicGuidance.split('.')[0]}.`,
        { caseId: caseRecord.id, speciesCategory: input.speciesCategory }
      );

      // CRITICAL: Notify wildlife-specialised responders ONLY (not general volunteers)
      await notificationService.notifyUsersNearLocation(
        input.location, 30,  // larger radius — wildlife rescuers are rarer
        [input.reporterUserId],
        "case",
        `🦎 Wildlife rescue — ${guidance.displayName}`,
        `${priority === "high" ? "URGENT: " : ""}${title}. Authorised wildlife rescuer needed.`,
        { caseId: caseRecord.id, speciesCategory: input.speciesCategory, priority, requiresWildlifeTraining: true }
      );

      // Find nearest centers
      const nearestCenters = await this.findNearestCenters(input.location, input.speciesCategory);

      logger.info("Wildlife rescue case created", { caseId: caseRecord.id, species: input.speciesCategory, condition: input.condition });

      return {
        caseRecord,
        guidance: {
          publicGuidance: guidance.publicGuidance,
          doNotDo: guidance.doNotDo,
          displayName: guidance.displayName,
        },
        nearestCenters,
      };
    });
  }

  // ── List all species categories ───────────────────────────────────────────
  async listSpeciesCategories(): Promise<WildlifeSpeciesCategory[]> {
    const result = await query<SpeciesRow>(
      `SELECT * FROM wildlife_species_categories WHERE is_active = TRUE ORDER BY display_name`
    );
    return result.rows.map(r => this.mapSpecies(r));
  }

  // ── List all wildlife centers ─────────────────────────────────────────────
  async listCenters(): Promise<WildlifeCenter[]> {
    const result = await query<CenterRow>(
      `SELECT id, name, phone, address,
              ST_Y(location::geometry) AS latitude,
              ST_X(location::geometry) AS longitude,
              accepted_species, operating_hours, is_24hr, city, NULL AS distance_km
       FROM wildlife_centers WHERE is_active = TRUE ORDER BY name`
    );
    return result.rows.map(r => ({
      id: r.id, name: r.name, phone: r.phone, address: r.address,
      location: r.latitude && r.longitude ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : null,
      acceptedSpecies: r.accepted_species, operatingHours: r.operating_hours,
      is24hr: r.is_24hr, city: r.city,
    }));
  }

  // ── Close a wildlife case (released / transferred to sanctuary) ───────────
  async closeWildlifeCase(
    actor: AuthenticatedUser,
    caseId: string,
    outcome: "released_to_habitat" | "transferred_to_sanctuary" | "deceased",
    notes?: string
  ): Promise<void> {
    if (!["ngo","govt","admin"].includes(actor.role)) {
      throw new AppError("Only NGOs and admins can close wildlife cases", 403, "FORBIDDEN");
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE cases SET status = 'resolved', resolution_notes = $2, updated_at = NOW() WHERE id = $1`,
        [caseId, `${outcome.replace(/_/g, " ")}: ${notes ?? "No additional notes"}`]
      );
      await client.query(
        `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
         VALUES ($1, $2, 'action_taken', 'resolved', $3)`,
        [caseId, actor.id, outcome]
      );
    });
  }
}

export const wildlifeService = new WildlifeService();
