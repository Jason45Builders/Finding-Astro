/**
 * case.repository.ts — FIXED
 *
 * CRITICAL FIX 1: CaseCreateInput.reporterUserId now string | null (guest path)
 * CRITICAL FIX 2: CaseCreateInput.description now optional (FIX 2 from earlier)
 * Both fixes align the interface with what case.service.ts actually passes.
 */

import { query, withTransaction } from "../../config/db";
import { CaseRecord, CaseStatus, CaseType } from "../../types/global.types";

export interface CaseCreateInput {
  animalId?: string | null;
  reporterUserId: string | null;    // CRITICAL FIX: was string, now string | null for guest path
  caseType: CaseType;
  priority?: "low" | "medium" | "high";
  title: string;
  description?: string | null;     // CRITICAL FIX: was required string, now optional
  locationText?: string | null;
  location: { latitude: number; longitude: number };
  evidenceUrls?: string[];
}

export interface CaseUpdateInput {
  assignedToUserId?: string | null;
  status?: CaseStatus;
  priority?: "low" | "medium" | "high";
  title?: string;
  description?: string;
  locationText?: string | null;
  evidenceUrls?: string[];
  resolutionNotes?: string | null;
}

export interface CaseListFilters {
  caseType?: CaseType;
  status?: CaseStatus;
  priority?: string;
  reporterUserId?: string;
  assignedToUserId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
}

interface CaseRow {
  id: string; animal_id: string | null; reporter_user_id: string;
  assigned_to_user_id: string | null; case_type: CaseType; status: CaseStatus;
  priority: string; title: string; description: string; location_text: string | null;
  latitude: number; longitude: number; evidence_urls: string[] | null;
  resolution_notes: string | null; created_at: Date; updated_at: Date; distance_km?: number | null;
}

const caseSelect = (distanceExpr = "NULL::double precision AS distance_km") => `
  SELECT c.id, c.animal_id, c.reporter_user_id, c.assigned_to_user_id,
         c.case_type, c.status, c.priority, c.title, c.description,
         c.location_text,
         ST_Y(c.location::geometry) AS latitude,
         ST_X(c.location::geometry) AS longitude,
         c.evidence_urls, c.resolution_notes, c.created_at, c.updated_at,
         ${distanceExpr}
  FROM cases c
`;

const mapCase = (row: CaseRow): CaseRecord => ({
  id: row.id, animalId: row.animal_id, reporterUserId: row.reporter_user_id,
  assignedToUserId: row.assigned_to_user_id, caseType: row.case_type, status: row.status,
  priority: row.priority as "low" | "medium" | "high", title: row.title,
  description: row.description, locationText: row.location_text,
  location: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
  evidenceUrls: row.evidence_urls ?? [], resolutionNotes: row.resolution_notes,
  createdAt: row.created_at, updatedAt: row.updated_at,
  ...(row.distance_km != null ? { distanceKm: Number(row.distance_km) } : {}),
});

class CaseRepository {
  async create(input: CaseCreateInput): Promise<CaseRecord> {
    return withTransaction(async (client) => {
      // CRITICAL FIX: use COALESCE so null description becomes a safe default
      const description = (input.description ?? "").trim() ||
        `${input.caseType.replace(/_/g, " ")} case reported via Finding Astro`;

      const result = await client.query<CaseRow>(
        `
          INSERT INTO cases (
            animal_id, reporter_user_id, case_type, status, priority,
            title, description, location_text, location, evidence_urls
          )
          VALUES ($1, $2, $3, 'open', $4, $5, $6, $7,
            ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography, $10)
          RETURNING
            id, animal_id, reporter_user_id, assigned_to_user_id,
            case_type, status, priority, title, description, location_text,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            evidence_urls, resolution_notes, created_at, updated_at,
            NULL::double precision AS distance_km
        `,
        [
          input.animalId ?? null,
          input.reporterUserId,          // now correctly nullable
          input.caseType,
          input.priority ?? "medium",
          input.title,
          description,                   // never null at DB layer
          input.locationText ?? null,
          input.location.longitude,
          input.location.latitude,
          input.evidenceUrls?.length ? input.evidenceUrls : [],
        ]
      );

      const caseRecord = result.rows[0];

      await client.query(
        `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
         VALUES ($1, $2, NULL, 'open', 'Case created')`,
        [caseRecord.id, input.reporterUserId]
      );

      return mapCase(caseRecord);
    });
  }

  async update(caseId: string, input: CaseUpdateInput, actorId?: string): Promise<CaseRecord | null> {
    const existing = await this.findById(caseId);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];
    const push = (col: string, val: unknown) => { values.push(val); updates.push(`${col} = $${values.length}`); };

    if (input.assignedToUserId !== undefined) push("assigned_to_user_id", input.assignedToUserId);
    if (input.status !== undefined)           push("status", input.status);
    if (input.priority !== undefined)         push("priority", input.priority);
    if (input.title !== undefined)            push("title", input.title);
    if (input.description !== undefined)      push("description", input.description);
    if (input.locationText !== undefined)     push("location_text", input.locationText);
    if (input.resolutionNotes !== undefined)  push("resolution_notes", input.resolutionNotes);
    if (input.evidenceUrls !== undefined)     push("evidence_urls", input.evidenceUrls);

    if (!updates.length) return existing;

    return withTransaction(async (client) => {
      values.push(caseId);
      const result = await client.query<CaseRow>(
        `UPDATE cases SET ${updates.join(", ")}, updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING
           id, animal_id, reporter_user_id, assigned_to_user_id,
           case_type, status, priority, title, description, location_text,
           ST_Y(location::geometry) AS latitude,
           ST_X(location::geometry) AS longitude,
           evidence_urls, resolution_notes, created_at, updated_at,
           NULL::double precision AS distance_km`,
        values
      );

      if (input.status && input.status !== existing.status) {
        await client.query(
          `INSERT INTO case_events (case_id, actor_id, from_status, to_status, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [caseId, actorId ?? null, existing.status, input.status, input.resolutionNotes ?? null]
        );
      }

      return result.rows[0] ? mapCase(result.rows[0]) : null;
    });
  }

  async findById(caseId: string): Promise<CaseRecord | null> {
    const result = await query<CaseRow>(`${caseSelect()} WHERE c.id = $1 LIMIT 1`, [caseId]);
    return result.rows[0] ? mapCase(result.rows[0]) : null;
  }

  async list(filters: CaseListFilters): Promise<CaseRecord[]> {
    const conditions: string[] = ["1 = 1"];
    const values: unknown[] = [];
    let distanceExpr = "NULL::double precision AS distance_km";

    const push = (condition: string, val: unknown) => {
      values.push(val);
      conditions.push(condition.replace("?", `$${values.length}`));
    };

    if (filters.caseType)         push("c.case_type = ?", filters.caseType);
    if (filters.status)           push("c.status = ?", filters.status);
    if (filters.priority)         push("c.priority = ?", filters.priority);
    if (filters.reporterUserId)   push("c.reporter_user_id = ?", filters.reporterUserId);
    if (filters.assignedToUserId) push("c.assigned_to_user_id = ?", filters.assignedToUserId);

    if (filters.latitude !== undefined && filters.longitude !== undefined) {
      values.push(filters.longitude); const li = values.length;
      values.push(filters.latitude);  const lai = values.length;
      values.push((filters.radiusKm ?? 10) * 1000); const radIdx = values.length;
      conditions.push(`ST_DWithin(c.location, ST_SetSRID(ST_MakePoint($${li}, $${lai}), 4326)::geography, $${radIdx})`);
      distanceExpr = `ST_Distance(c.location, ST_SetSRID(ST_MakePoint($${li}, $${lai}), 4326)::geography) / 1000`;
    }

    values.push(filters.limit ?? 50);
    const limitIdx = values.length;

    const result = await query<CaseRow>(
      `${caseSelect(distanceExpr + " AS distance_km")}
       WHERE ${conditions.join(" AND ")}
       ORDER BY
         CASE c.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         CASE c.status WHEN 'open' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END,
         c.created_at DESC
       LIMIT $${limitIdx}`,
      values
    );

    return result.rows.map(mapCase);
  }

  async countNearbyRecentCases(
    caseType: CaseType, location: { latitude: number; longitude: number },
    radiusKm: number, lookbackDays: number
  ): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM cases
       WHERE case_type = $1
         AND created_at >= NOW() - ($2 || ' days')::interval
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)`,
      [caseType, lookbackDays, location.longitude, location.latitude, radiusKm * 1000]
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}

export const caseRepository = new CaseRepository();
