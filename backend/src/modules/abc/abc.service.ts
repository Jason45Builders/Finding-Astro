import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import { AbcTrackingRecord, AnimalRecord } from "../../types/global.types";
import { haversineDistanceKm } from "../../utils/geo.utils";
import { notificationService } from "../notifications/notification.service";

interface AbcEventRow {
  id: string;
  animal_id: string;
  animal_name: string | null;
  case_id: string | null;
  event_type: "request" | "capture" | "surgery" | "return";
  status: string;
  notes: string | null;
  latitude: number;
  longitude: number;
  geo_validated: boolean;
  unreturned_alert: boolean;
  requested_by_user_id: string;
  created_at: Date;
}

interface AbcRequestInput {
  animalId: string;
  requestedByUserId: string;
  notes?: string | null;
  locationText?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface AbcEventInput {
  animalId: string;
  requestedByUserId: string;
  requestedByUserRole: "citizen" | "ngo" | "govt" | "admin" | "hospital";
  eventType: "request" | "capture" | "surgery" | "return";
  status: string;
  notes?: string | null;
  caseId?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
}

const mapAbcRow = (row: AbcEventRow): AbcTrackingRecord => ({
  id: row.id,
  animalId: row.animal_id,
  animalName: row.animal_name,
  caseId: row.case_id,
  eventType: row.event_type,
  status: row.status,
  notes: row.notes,
  location: {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  },
  geoValidated: row.geo_validated,
  unreturnedAlert: row.unreturned_alert,
  requestedByUserId: row.requested_by_user_id,
  createdAt: row.created_at
});

const selectEvent = `
  SELECT
    ae.id,
    ae.animal_id,
    a.name AS animal_name,
    ae.case_id,
    ae.event_type,
    ae.status,
    ae.notes,
    ST_Y(ae.location::geometry) AS latitude,
    ST_X(ae.location::geometry) AS longitude,
    ae.geo_validated,
    ae.unreturned_alert,
    ae.requested_by_user_id,
    ae.created_at
  FROM abc_events ae
  JOIN animals a ON a.id = ae.animal_id
`;

class AbcService {
  async createRequest(input: AbcRequestInput): Promise<AbcTrackingRecord> {
    const { eventId, caseId } = await withTransaction(async (client) => {
      const caseResult = await client.query<{ id: string }>(
        `
          INSERT INTO cases (
            animal_id,
            reporter_user_id,
            case_type,
            status,
            priority,
            title,
            description,
            location_text,
            location
          )
          VALUES (
            $1,
            $2,
            'abc',
            'open',
            'medium',
            $3,
            $4,
            $5,
            ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography
          )
          RETURNING id
        `,
        [
          input.animalId,
          input.requestedByUserId,
          `ABC request for animal ${input.animalId.slice(0, 8)}`,
          input.notes ?? "Sterilization requested by field user.",
          input.locationText ?? null,
          input.location.longitude,
          input.location.latitude
        ]
      );

      const eventResult = await client.query<AbcEventRow>(
        `
          INSERT INTO abc_events (
            animal_id,
            case_id,
            requested_by_user_id,
            event_type,
            status,
            notes,
            location,
            geo_validated
          )
          VALUES (
            $1,
            $2,
            $3,
            'request',
            'queued',
            $4,
            ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
            TRUE
          )
          RETURNING
            id,
            animal_id,
            NULL::text AS animal_name,
            case_id,
            event_type,
            status,
            notes,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            geo_validated,
            requested_by_user_id,
            created_at
        `,
        [
          input.animalId,
          caseResult.rows[0].id,
          input.requestedByUserId,
          input.notes ?? null,
          input.location.longitude,
          input.location.latitude
        ]
      );

      return {
        eventId: eventResult.rows[0].id,
        caseId: caseResult.rows[0].id
      };
    });

    const stored = await this.getTrackingByEventId(eventId);

    await notificationService.notifyUser(
      input.requestedByUserId,
      "abc",
      "ABC request queued",
      "Your sterilization request has been logged for follow-up.",
      { animalId: input.animalId, caseId }
    );

    return stored;
  }

  async logEvent(input: AbcEventInput): Promise<AbcTrackingRecord> {
    if (
      input.eventType === "surgery" &&
      !["hospital", "govt", "admin"].includes(input.requestedByUserRole)
    ) {
      throw new AppError(
        "Only a hospital or platform authority can log surgery events",
        403,
        "FORBIDDEN"
      );
    }

    let geoValidated = input.eventType !== "return";

    if (input.eventType === "return") {
      const reference = await this.getLatestReferenceLocation(input.animalId);

      if (reference) {
        geoValidated =
          haversineDistanceKm(reference, {
            latitude: input.location.latitude,
            longitude: input.location.longitude
          }) <= 1.5;
      }
    }

    const result = await query<AbcEventRow>(
      `
        INSERT INTO abc_events (
          animal_id,
          case_id,
          requested_by_user_id,
          event_type,
          status,
          notes,
          location,
          geo_validated
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
          $9
        )
        RETURNING
          id,
          animal_id,
          NULL::text AS animal_name,
          case_id,
          event_type,
          status,
          notes,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          geo_validated,
          requested_by_user_id,
          created_at
      `,
      [
        input.animalId,
        input.caseId ?? null,
        input.requestedByUserId,
        input.eventType,
        input.status,
        input.notes ?? null,
        input.location.longitude,
        input.location.latitude,
        geoValidated
      ]
    );

    if (input.caseId) {
      const targetStatus =
        input.eventType === "return" ? "resolved" : input.eventType === "surgery" ? "action_taken" : "in_review";
      await query(`UPDATE cases SET status = $1, updated_at = NOW() WHERE id = $2`, [
        targetStatus,
        input.caseId
      ]);
    }

    const stored = await this.getTrackingByEventId(result.rows[0].id);

    await notificationService.notifyUser(
      input.requestedByUserId,
      "abc",
      "ABC event logged",
      `${input.eventType} event saved${geoValidated ? "" : " with return-location warning"}.`,
      { animalId: input.animalId, caseId: input.caseId ?? null, eventType: input.eventType }
    );

    return stored;
  }

  async listTracking(animalId?: string): Promise<AbcTrackingRecord[]> {
    const values: string[] = [];
    const whereClause = animalId ? "WHERE ae.animal_id = $1" : "";

    if (animalId) {
      values.push(animalId);
    }

    const result = await query<AbcEventRow>(
      `
        ${selectEvent}
        ${whereClause}
        ORDER BY ae.created_at DESC
      `,
      values
    );

    return result.rows.map(mapAbcRow);
  }

  private async getLatestReferenceLocation(
    animalId: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    const result = await query<{ latitude: number; longitude: number }>(
      `
        SELECT
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude
        FROM abc_events
        WHERE animal_id = $1 AND event_type IN ('capture', 'request')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [animalId]
    );

    return result.rows[0] ?? null;
  }

  private async getTrackingByEventId(eventId: string): Promise<AbcTrackingRecord> {
    const result = await query<AbcEventRow>(`${selectEvent} WHERE ae.id = $1 LIMIT 1`, [eventId]);

    if (!result.rows[0]) {
      throw new AppError("ABC event not found", 404, "ABC_EVENT_NOT_FOUND");
    }

    return mapAbcRow(result.rows[0]);
  }
}

export const abcService = new AbcService();
