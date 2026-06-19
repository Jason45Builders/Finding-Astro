import { query } from "../../config/db";
import { CaseRecord } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";

interface ConflictInput {
  reporterUserId: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  locationText?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  evidenceUrls?: string[];
}

interface ConflictSuggestionResponse {
  caseRecord: CaseRecord;
  suggestedActions: string[];
}

interface CaseRow {
  id: string;
  animal_id: string | null;
  reporter_user_id: string;
  assigned_to_user_id: string | null;
  case_type: "conflict";
  status: "open" | "in_review" | "action_taken" | "resolved" | "closed";
  priority: string;
  title: string;
  description: string;
  location_text: string | null;
  latitude: number;
  longitude: number;
  evidence_urls: string[] | null;
  resolution_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapCase = (row: CaseRow): CaseRecord => ({
  id: row.id,
  animalId: row.animal_id,
  reporterUserId: row.reporter_user_id,
  assignedToUserId: row.assigned_to_user_id,
  caseType: row.case_type,
  status: row.status,
  priority: row.priority,
  title: row.title,
  description: row.description,
  locationText: row.location_text,
  location: {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  },
  evidenceUrls: row.evidence_urls ?? [],
  resolutionNotes: row.resolution_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const buildConflictSuggestions = (severity: "low" | "medium" | "high"): string[] => {
  if (severity === "high") {
    return [
      "Separate animals and people immediately if there is an active bite or aggression risk.",
      "Collect timestamped photo or video evidence from a safe distance.",
      "Escalate the case to the nearest NGO or government responder within the hour."
    ];
  }

  if (severity === "medium") {
    return [
      "Document feeding spots, crowd triggers, and recent behavior changes.",
      "Coordinate a mediated site visit with caretakers and local residents.",
      "Consider sterilization, vaccination, or signage interventions to reduce repeat conflict."
    ];
  }

  return [
    "Log the concern and monitor the location for repeat incidents.",
    "Share calm-handling guidance with nearby residents and caretakers.",
    "Schedule a follow-up review if the pattern worsens over the next week."
  ];
};

class ConflictService {
  async logConcern(input: ConflictInput): Promise<ConflictSuggestionResponse> {
    const result = await query<CaseRow>(
      `
        INSERT INTO cases (
          reporter_user_id,
          case_type,
          status,
          priority,
          title,
          description,
          location_text,
          location,
          evidence_urls
        )
        VALUES (
          $1,
          'conflict',
          'open',
          $2,
          $3,
          $4,
          $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
          $8
        )
        RETURNING
          id,
          animal_id,
          reporter_user_id,
          assigned_to_user_id,
          case_type,
          status,
          priority,
          title,
          description,
          location_text,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          evidence_urls,
          resolution_notes,
          created_at,
          updated_at
      `,
      [
        input.reporterUserId,
        input.severity,
        input.title,
        input.description,
        input.locationText ?? null,
        input.location.longitude,
        input.location.latitude,
        input.evidenceUrls ?? []
      ]
    );

    const caseRecord = mapCase(result.rows[0]);
    const suggestedActions = buildConflictSuggestions(input.severity);

    await notificationService.notifyUser(
      input.reporterUserId,
      "conflict",
      "Conflict concern logged",
      `${input.title} has been captured and action suggestions are ready.`,
      { caseId: caseRecord.id, severity: input.severity }
    );

    return { caseRecord, suggestedActions };
  }

  async listConflicts(): Promise<CaseRecord[]> {
    const result = await query<CaseRow>(
      `
        SELECT
          c.id,
          c.animal_id,
          c.reporter_user_id,
          c.assigned_to_user_id,
          c.case_type,
          c.status,
          c.priority,
          c.title,
          c.description,
          c.location_text,
          ST_Y(c.location::geometry) AS latitude,
          ST_X(c.location::geometry) AS longitude,
          c.evidence_urls,
          c.resolution_notes,
          c.created_at,
          c.updated_at
        FROM cases c
        WHERE c.case_type = 'conflict'
        ORDER BY c.updated_at DESC
      `
    );

    return result.rows.map(mapCase);
  }
}

export const conflictService = new ConflictService();
