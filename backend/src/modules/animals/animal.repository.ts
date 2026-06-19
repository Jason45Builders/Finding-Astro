import { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";
import {
  AbuseFlagRecord,
  AnimalPresenceRecord,
  AnimalRecord,
  MedicalEntryType,
  MedicalHistoryRecord,
  SightingRecord,
  VaccinationRecord,
  VaccinationStatus,
  VisualSignature
} from "../../types/global.types";

export interface AnimalMutationInput {
  name?: string | null;
  species: string;
  breed?: string | null;
  gender?: string | null;
  color?: string | null;
  approxAgeMonths?: number | null;
  size?: string | null;
  temperament?: string | null;
  distinguishingMarks?: string | null;
  description?: string | null;
  status?: "community" | "lost" | "found" | "reunited" | "adopted";
  primaryPhotoUrl?: string | null;
  photoUrls?: string[];
  isSterilized?: boolean;
  lastSeenText?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  territoryLabel?: string | null;
  visualSignature?: VisualSignature;
  lastSeenAt?: Date | null;
  lastConfirmedAliveAt?: Date | null;
  seenTodayCount?: number;
  disappearanceRiskLevel?: "stable" | "watch" | "urgent";
  caretakerUserId?: string | null;
  createdByUserId?: string | null;
}

export interface AnimalSearchFilters {
  species?: string;
  status?: string;
  queryText?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  territoryLabel?: string;
  needsAttention?: boolean;
  limit?: number;
}

export interface AnimalUpdateInput {
  name?: string | null;
  species?: string;
  breed?: string | null;
  gender?: string | null;
  color?: string | null;
  approxAgeMonths?: number | null;
  size?: string | null;
  temperament?: string | null;
  distinguishingMarks?: string | null;
  description?: string | null;
  status?: "community" | "lost" | "found" | "reunited" | "adopted";
  primaryPhotoUrl?: string | null;
  photoUrls?: string[];
  isSterilized?: boolean;
  lastSeenText?: string | null;
  location?: {
    latitude: number;
    longitude: number;
  };
  territoryLabel?: string | null;
  visualSignature?: VisualSignature;
  lastSeenAt?: Date | null;
  lastConfirmedAliveAt?: Date | null;
  seenTodayCount?: number;
  disappearanceRiskLevel?: "stable" | "watch" | "urgent";
  caretakerUserId?: string | null;
}

export interface SightingInput {
  animalId?: string | null;
  reporterUserId: string;
  matchedAnimalId?: string | null;
  description: string;
  locationText?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  photoUrl?: string | null;
  confidenceScore?: number | null;
}

export interface PresenceLogInput {
  animalId: string;
  seenByUserId: string;
  source?: string;
  observationNotes?: string | null;
  territoryLabel?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  seenAt?: Date;
}

export interface VaccinationInput {
  animalId: string;
  caseId?: string | null;
  administeredByUserId?: string | null;
  vaccineName: string;
  administeredAt: Date;
  expiresAt?: Date | null;
  batchNumber?: string | null;
  notes?: string | null;
  verified: boolean;
  status: VaccinationStatus;
}

export interface MedicalHistoryInput {
  animalId: string;
  caseId?: string | null;
  abcEventId?: string | null;
  createdByUserId?: string | null;
  entryType: MedicalEntryType;
  title: string;
  notes?: string | null;
  providerName?: string | null;
  treatmentDate: Date;
  costAmount?: number | null;
  attachments?: string[];
}

interface AnimalRow {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  gender: string | null;
  color: string | null;
  approx_age_months: number | null;
  size: string | null;
  temperament: string | null;
  distinguishing_marks: string | null;
  description: string | null;
  status: "community" | "lost" | "found" | "reunited" | "adopted";
  primary_photo_url: string | null;
  photo_urls: string[] | null;
  is_sterilized: boolean;
  last_seen_text: string | null;
  latitude: number;
  longitude: number;
  territory_label: string | null;
  visual_signature: VisualSignature | null;
  last_seen_at: Date | null;
  last_confirmed_alive_at: Date | null;
  seen_today_count: number;
  disappearance_risk_level: "stable" | "watch" | "urgent";
  vaccination_status: VaccinationStatus | null;
  caretaker_user_id: string | null;
  created_by_user_id: string | null;
  adoptable_since: Date | null;
  adoption_notes: string | null;
  created_at: Date;
  updated_at: Date;
  distance_km?: number | null;
  territory_population?: number | null;
}

interface SightingRow {
  id: string;
  animal_id: string | null;
  reporter_user_id: string;
  matched_animal_id: string | null;
  description: string;
  location_text: string | null;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  confidence_score: number | null;
  created_at: Date;
}

interface PresenceRow {
  id: string;
  animal_id: string;
  seen_by_user_id: string;
  source: string;
  observation_notes: string | null;
  territory_label: string | null;
  latitude: number;
  longitude: number;
  seen_at: Date;
}

interface VaccinationRow {
  id: string;
  animal_id: string;
  case_id: string | null;
  administered_by_user_id: string | null;
  vaccine_name: string;
  administered_at: Date;
  expires_at: Date | null;
  batch_number: string | null;
  notes: string | null;
  verified: boolean;
  status: VaccinationStatus;
  created_at: Date;
}

interface MedicalHistoryRow {
  id: string;
  animal_id: string;
  case_id: string | null;
  abc_event_id: string | null;
  created_by_user_id: string | null;
  entry_type: MedicalEntryType;
  title: string;
  notes: string | null;
  provider_name: string | null;
  treatment_date: Date;
  cost_amount: string | number | null;
  attachments: string[] | null;
  created_at: Date;
}

interface AbuseFlagRow {
  id: string;
  case_id: string | null;
  animal_id: string | null;
  flagged_by_user_id: string | null;
  severity_score: number;
  pattern_key: string;
  reason: string;
  status: "internal_review" | "watch" | "escalated" | "cleared";
  internal_notes: string | null;
  created_at: Date;
}

interface TerritorySummaryRow {
  territory_label: string | null;
  animal_count: number;
  urgent_count: number;
  seen_today_total: number;
}

const defaultVisualSignature = (): VisualSignature => ({
  speciesToken: "",
  colorTokens: [],
  breedTokens: [],
  distinguishingTokens: [],
  photoFingerprint: ""
});

const animalSelect = (
  distanceExpression = "NULL::double precision AS distance_km",
  territoryPopulationExpression = "NULL::integer AS territory_population"
): string => `
  SELECT
    a.id,
    a.name,
    a.species,
    a.breed,
    a.gender,
    a.color,
    a.approx_age_months,
    a.size,
    a.temperament,
    a.distinguishing_marks,
    a.description,
    a.status,
    a.primary_photo_url,
    COALESCE(
      (
        SELECT ARRAY_AGG(ap.url ORDER BY ap.created_at)
        FROM animal_photos ap
        WHERE ap.animal_id = a.id
      ),
      ARRAY[]::TEXT[]
    ) AS photo_urls,
    a.is_sterilized,
    a.last_seen_text,
    ST_Y(a.location::geometry) AS latitude,
    ST_X(a.location::geometry) AS longitude,
    a.territory_label,
    a.visual_signature,
    a.last_seen_at,
    a.last_confirmed_alive_at,
    a.seen_today_count,
    a.disappearance_risk_level,
    latest_vaccine.status AS vaccination_status,
    a.caretaker_user_id,
    a.created_by_user_id,
    a.adoptable_since,
    a.adoption_notes,
    a.created_at,
    a.updated_at,
    ${distanceExpression},
    ${territoryPopulationExpression}
  FROM animals a
  LEFT JOIN LATERAL (
    SELECT vr.status
    FROM vaccination_records vr
    WHERE vr.animal_id = a.id
    ORDER BY vr.administered_at DESC, vr.created_at DESC
    LIMIT 1
  ) latest_vaccine ON TRUE
`;

const mapAnimal = (row: AnimalRow): AnimalRecord => ({
  id: row.id,
  name: row.name,
  species: row.species,
  breed: row.breed,
  gender: row.gender,
  color: row.color,
  approxAgeMonths: row.approx_age_months,
  size: row.size,
  temperament: row.temperament,
  distinguishingMarks: row.distinguishing_marks,
  description: row.description,
  status: row.status,
  primaryPhotoUrl: row.primary_photo_url,
  photoUrls: row.photo_urls ?? [],
  isSterilized: row.is_sterilized,
  lastSeenText: row.last_seen_text,
  location: {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  },
  territoryLabel: row.territory_label,
  visualSignature: row.visual_signature ?? defaultVisualSignature(),
  lastSeenAt: row.last_seen_at,
  lastConfirmedAliveAt: row.last_confirmed_alive_at,
  seenTodayCount: row.seen_today_count,
  disappearanceRiskLevel: row.disappearance_risk_level,
  vaccinationStatus: row.vaccination_status,
  caretakerUserId: row.caretaker_user_id,
  createdByUserId: row.created_by_user_id,
  adoptableSince: row.adoptable_since,
  adoptionNotes: row.adoption_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.distance_km !== null && row.distance_km !== undefined
    ? { distanceKm: Number(row.distance_km) }
    : {}),
  ...(row.territory_population !== null && row.territory_population !== undefined
    ? { territoryPopulation: Number(row.territory_population) }
    : {})
});

const mapSighting = (row: SightingRow): SightingRecord => ({
  id: row.id,
  animalId: row.animal_id,
  reporterUserId: row.reporter_user_id,
  matchedAnimalId: row.matched_animal_id,
  description: row.description,
  locationText: row.location_text,
  location: {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  },
  photoUrl: row.photo_url,
  confidenceScore: row.confidence_score !== null ? Number(row.confidence_score) : null,
  createdAt: row.created_at
});

const mapPresence = (row: PresenceRow): AnimalPresenceRecord => ({
  id: row.id,
  animalId: row.animal_id,
  seenByUserId: row.seen_by_user_id,
  source: row.source,
  observationNotes: row.observation_notes,
  territoryLabel: row.territory_label,
  location: {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude)
  },
  seenAt: row.seen_at
});

const mapVaccination = (row: VaccinationRow): VaccinationRecord => ({
  id: row.id,
  animalId: row.animal_id,
  caseId: row.case_id,
  administeredByUserId: row.administered_by_user_id,
  vaccineName: row.vaccine_name,
  administeredAt: row.administered_at,
  expiresAt: row.expires_at,
  batchNumber: row.batch_number,
  notes: row.notes,
  verified: row.verified,
  status: row.status,
  createdAt: row.created_at
});

const mapMedicalHistory = (row: MedicalHistoryRow): MedicalHistoryRecord => ({
  id: row.id,
  animalId: row.animal_id,
  caseId: row.case_id,
  abcEventId: row.abc_event_id,
  createdByUserId: row.created_by_user_id,
  entryType: row.entry_type,
  title: row.title,
  notes: row.notes,
  providerName: row.provider_name,
  treatmentDate: row.treatment_date,
  costAmount: row.cost_amount !== null ? Number(row.cost_amount) : null,
  attachments: row.attachments ?? [],
  createdAt: row.created_at
});

const mapAbuseFlag = (row: AbuseFlagRow): AbuseFlagRecord => ({
  id: row.id,
  caseId: row.case_id,
  animalId: row.animal_id,
  flaggedByUserId: row.flagged_by_user_id,
  severityScore: row.severity_score,
  patternKey: row.pattern_key,
  reason: row.reason,
  status: row.status,
  internalNotes: row.internal_notes,
  createdAt: row.created_at
});

const insertPhotos = async (
  client: PoolClient,
  animalId: string,
  photoUrls: string[]
): Promise<void> => {
  for (const photoUrl of photoUrls) {
    await client.query(
      `
        INSERT INTO animal_photos (animal_id, url)
        VALUES ($1, $2)
      `,
      [animalId, photoUrl]
    );
  }
};

class AnimalRepository {
  async create(input: AnimalMutationInput): Promise<AnimalRecord> {
    const animalId = await withTransaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO animals (
            name,
            species,
            breed,
            gender,
            color,
            approx_age_months,
            size,
            temperament,
            distinguishing_marks,
            description,
            status,
            primary_photo_url,
            is_sterilized,
            last_seen_text,
            location,
            territory_label,
            visual_signature,
            last_seen_at,
            last_confirmed_alive_at,
            seen_today_count,
            disappearance_risk_level,
            caretaker_user_id,
            created_by_user_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            ST_SetSRID(ST_MakePoint($15, $16), 4326)::geography,
            $17,
            $18,
            $19,
            $20,
            $21,
            $22,
            $23,
            $24
          )
          RETURNING id
        `,
        [
          input.name ?? null,
          input.species,
          input.breed ?? null,
          input.gender ?? null,
          input.color ?? null,
          input.approxAgeMonths ?? null,
          input.size ?? null,
          input.temperament ?? null,
          input.distinguishingMarks ?? null,
          input.description ?? null,
          input.status ?? "community",
          input.primaryPhotoUrl ?? null,
          input.isSterilized ?? false,
          input.lastSeenText ?? null,
          input.location.longitude,
          input.location.latitude,
          input.territoryLabel ?? null,
          JSON.stringify(input.visualSignature ?? defaultVisualSignature()),
          input.lastSeenAt ?? null,
          input.lastConfirmedAliveAt ?? null,
          input.seenTodayCount ?? 0,
          input.disappearanceRiskLevel ?? "stable",
          input.caretakerUserId ?? null,
          input.createdByUserId ?? null
        ]
      );

      const createdAnimalId = result.rows[0].id;

      if (input.photoUrls?.length) {
        await insertPhotos(client, createdAnimalId, input.photoUrls);
      }

      return createdAnimalId;
    });

    const animal = await this.findById(animalId);

    if (!animal) {
      throw new Error("Failed to load created animal");
    }

    return animal;
  }

  async update(animalId: string, input: AnimalUpdateInput): Promise<AnimalRecord | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    const pushValue = (column: string, value: unknown): void => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (input.name !== undefined) pushValue("name", input.name);
    if (input.species !== undefined) pushValue("species", input.species);
    if (input.breed !== undefined) pushValue("breed", input.breed);
    if (input.gender !== undefined) pushValue("gender", input.gender);
    if (input.color !== undefined) pushValue("color", input.color);
    if (input.approxAgeMonths !== undefined) pushValue("approx_age_months", input.approxAgeMonths);
    if (input.size !== undefined) pushValue("size", input.size);
    if (input.temperament !== undefined) pushValue("temperament", input.temperament);
    if (input.distinguishingMarks !== undefined) {
      pushValue("distinguishing_marks", input.distinguishingMarks);
    }
    if (input.description !== undefined) pushValue("description", input.description);
    if (input.status !== undefined) pushValue("status", input.status);
    if (input.primaryPhotoUrl !== undefined) pushValue("primary_photo_url", input.primaryPhotoUrl);
    if (input.isSterilized !== undefined) pushValue("is_sterilized", input.isSterilized);
    if (input.lastSeenText !== undefined) pushValue("last_seen_text", input.lastSeenText);
    if (input.territoryLabel !== undefined) pushValue("territory_label", input.territoryLabel);
    if (input.lastSeenAt !== undefined) pushValue("last_seen_at", input.lastSeenAt);
    if (input.lastConfirmedAliveAt !== undefined) {
      pushValue("last_confirmed_alive_at", input.lastConfirmedAliveAt);
    }
    if (input.seenTodayCount !== undefined) pushValue("seen_today_count", input.seenTodayCount);
    if (input.disappearanceRiskLevel !== undefined) {
      pushValue("disappearance_risk_level", input.disappearanceRiskLevel);
    }
    if (input.caretakerUserId !== undefined) pushValue("caretaker_user_id", input.caretakerUserId);

    if (input.visualSignature !== undefined) {
      values.push(JSON.stringify(input.visualSignature));
      updates.push(`visual_signature = $${values.length}::jsonb`);
    }

    if (input.location) {
      values.push(input.location.longitude);
      const longitudeIndex = values.length;
      values.push(input.location.latitude);
      const latitudeIndex = values.length;
      updates.push(
        `location = ST_SetSRID(ST_MakePoint($${longitudeIndex}, $${latitudeIndex}), 4326)::geography`
      );
    }

    if (!updates.length && input.photoUrls === undefined) {
      return this.findById(animalId);
    }

    const updatedAnimalId = await withTransaction(async (client) => {
      if (updates.length) {
        values.push(animalId);
        await client.query(
          `
            UPDATE animals
            SET ${updates.join(", ")}, updated_at = NOW()
            WHERE id = $${values.length}
          `,
          values as any[]
        );
      }

      if (input.photoUrls !== undefined) {
        await client.query(`DELETE FROM animal_photos WHERE animal_id = $1`, [animalId]);
        if (input.photoUrls.length) {
          await insertPhotos(client, animalId, input.photoUrls);
        }
      }

      return animalId;
    });

    return this.findById(updatedAnimalId);
  }

  async findById(animalId: string): Promise<AnimalRecord | null> {
    const result = await query<AnimalRow>(
      `${animalSelect("NULL::double precision AS distance_km", "(SELECT COUNT(*)::int FROM animals territory WHERE territory.territory_label = a.territory_label) AS territory_population")} WHERE a.id = $1 LIMIT 1`,
      [animalId]
    );
    return result.rows[0] ? mapAnimal(result.rows[0]) : null;
  }

  async search(filters: AnimalSearchFilters): Promise<AnimalRecord[]> {
    const conditions: string[] = ["1 = 1"];
    const values: Array<string | number | boolean> = [];
    let distanceExpression = "NULL::double precision AS distance_km";

    if (filters.species) {
      values.push(filters.species);
      conditions.push(`a.species ILIKE $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`a.status = $${values.length}`);
    }

    if (filters.queryText) {
      values.push(`%${filters.queryText}%`);
      conditions.push(
        `(COALESCE(a.name, '') ILIKE $${values.length} OR COALESCE(a.breed, '') ILIKE $${values.length} OR COALESCE(a.color, '') ILIKE $${values.length} OR COALESCE(a.description, '') ILIKE $${values.length} OR COALESCE(a.territory_label, '') ILIKE $${values.length})`
      );
    }

    if (filters.territoryLabel) {
      values.push(filters.territoryLabel);
      conditions.push(`a.territory_label = $${values.length}`);
    }

    if (filters.needsAttention) {
      conditions.push(`(a.disappearance_risk_level <> 'stable' OR latest_vaccine.status = 'expired')`);
    }

    if (filters.latitude !== undefined && filters.longitude !== undefined) {
      values.push(filters.longitude);
      const longitudeIndex = values.length;
      values.push(filters.latitude);
      const latitudeIndex = values.length;
      values.push((filters.radiusKm ?? 5) * 1000);
      const radiusIndex = values.length;

      conditions.push(
        `ST_DWithin(a.location, ST_SetSRID(ST_MakePoint($${longitudeIndex}, $${latitudeIndex}), 4326)::geography, $${radiusIndex})`
      );
      distanceExpression = `ST_Distance(a.location, ST_SetSRID(ST_MakePoint($${longitudeIndex}, $${latitudeIndex}), 4326)::geography) / 1000 AS distance_km`;
    }

    values.push(filters.limit ?? 50);
    const limitIndex = values.length;

    const result = await query<AnimalRow>(
      `
        ${animalSelect(distanceExpression)}
        WHERE ${conditions.join(" AND ")}
        ORDER BY
          CASE a.disappearance_risk_level WHEN 'urgent' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END,
          distance_km NULLS LAST,
          a.updated_at DESC
        LIMIT $${limitIndex}
      `,
      values
    );

    return result.rows.map(mapAnimal);
  }

  async findPotentialDuplicates(
    input: Pick<AnimalMutationInput, "species" | "color" | "breed" | "location" | "territoryLabel">,
    excludeAnimalId?: string
  ): Promise<AnimalRecord[]> {
    const conditions: string[] = [
      "a.species ILIKE $1",
      "ST_DWithin(a.location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)"
    ];
    const values: Array<string | number> = [
      input.species,
      input.location.longitude,
      input.location.latitude,
      1800
    ];

    if (excludeAnimalId) {
      values.push(excludeAnimalId);
      conditions.push(`a.id <> $${values.length}`);
    }

    if (input.color) {
      values.push(`%${input.color}%`);
      conditions.push(`COALESCE(a.color, '') ILIKE $${values.length}`);
    }

    if (input.breed) {
      values.push(`%${input.breed}%`);
      conditions.push(`COALESCE(a.breed, '') ILIKE $${values.length}`);
    }

    if (input.territoryLabel) {
      values.push(input.territoryLabel);
      conditions.push(`(a.territory_label = $${values.length} OR a.territory_label IS NULL)`);
    }

    const result = await query<AnimalRow>(
      `
        ${animalSelect(
          "ST_Distance(a.location, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) / 1000 AS distance_km"
        )}
        WHERE ${conditions.join(" AND ")}
        ORDER BY distance_km ASC, a.updated_at DESC
        LIMIT 5
      `,
      values
    );

    return result.rows.map(mapAnimal);
  }

  async createSighting(input: SightingInput): Promise<SightingRecord> {
    const result = await query<SightingRow>(
      `
        INSERT INTO sightings (
          animal_id,
          reporter_user_id,
          matched_animal_id,
          description,
          location_text,
          location,
          photo_url,
          confidence_score
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
          $8,
          $9
        )
        RETURNING
          id,
          animal_id,
          reporter_user_id,
          matched_animal_id,
          description,
          location_text,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          photo_url,
          confidence_score,
          created_at
      `,
      [
        input.animalId ?? null,
        input.reporterUserId,
        input.matchedAnimalId ?? null,
        input.description,
        input.locationText ?? null,
        input.location.longitude,
        input.location.latitude,
        input.photoUrl ?? null,
        input.confidenceScore ?? null
      ]
    );

    return mapSighting(result.rows[0]);
  }

  async listSightings(animalId?: string): Promise<SightingRecord[]> {
    const values: string[] = [];
    const conditions: string[] = [];

    if (animalId) {
      values.push(animalId);
      conditions.push(`(s.animal_id = $1 OR s.matched_animal_id = $1)`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await query<SightingRow>(
      `
        SELECT
          s.id,
          s.animal_id,
          s.reporter_user_id,
          s.matched_animal_id,
          s.description,
          s.location_text,
          ST_Y(s.location::geometry) AS latitude,
          ST_X(s.location::geometry) AS longitude,
          s.photo_url,
          s.confidence_score,
          s.created_at
        FROM sightings s
        ${whereClause}
        ORDER BY s.created_at DESC
      `,
      values
    );

    return result.rows.map(mapSighting);
  }

  async logPresence(input: PresenceLogInput): Promise<AnimalPresenceRecord> {
    const seenAt = input.seenAt ?? new Date();

    return withTransaction(async (client) => {
      const insertResult = await client.query<PresenceRow>(
        `
          INSERT INTO animal_presence_logs (
            animal_id,
            seen_by_user_id,
            source,
            observation_notes,
            territory_label,
            location,
            seen_at
          )
          VALUES (
            $1,
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
            seen_by_user_id,
            source,
            observation_notes,
            territory_label,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            seen_at
        `,
        [
          input.animalId,
          input.seenByUserId,
          input.source ?? "manual",
          input.observationNotes ?? null,
          input.territoryLabel ?? null,
          input.location.longitude,
          input.location.latitude,
          seenAt
        ]
      );

      await client.query(
        `
          UPDATE animals
          SET
            territory_label = COALESCE($2, territory_label),
            last_seen_at = $3,
            last_confirmed_alive_at = $3,
            seen_today_count = (
              SELECT COUNT(*)::int
              FROM animal_presence_logs apl
              WHERE apl.animal_id = $1
                AND DATE(apl.seen_at) = DATE($3::timestamptz)
            ),
            disappearance_risk_level = 'stable',
            updated_at = NOW()
          WHERE id = $1
        `,
        [input.animalId, input.territoryLabel ?? null, seenAt]
      );

      return mapPresence(insertResult.rows[0]);
    });
  }

  async listPresenceLogs(animalId: string, limit = 10): Promise<AnimalPresenceRecord[]> {
    const result = await query<PresenceRow>(
      `
        SELECT
          id,
          animal_id,
          seen_by_user_id,
          source,
          observation_notes,
          territory_label,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          seen_at
        FROM animal_presence_logs
        WHERE animal_id = $1
        ORDER BY seen_at DESC
        LIMIT $2
      `,
      [animalId, limit]
    );

    return result.rows.map(mapPresence);
  }

  async addVaccinationRecord(input: VaccinationInput): Promise<VaccinationRecord> {
    const result = await query<VaccinationRow>(
      `
        INSERT INTO vaccination_records (
          animal_id,
          case_id,
          administered_by_user_id,
          vaccine_name,
          administered_at,
          expires_at,
          batch_number,
          notes,
          verified,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          animal_id,
          case_id,
          administered_by_user_id,
          vaccine_name,
          administered_at,
          expires_at,
          batch_number,
          notes,
          verified,
          status,
          created_at
      `,
      [
        input.animalId,
        input.caseId ?? null,
        input.administeredByUserId ?? null,
        input.vaccineName,
        input.administeredAt,
        input.expiresAt ?? null,
        input.batchNumber ?? null,
        input.notes ?? null,
        input.verified,
        input.status
      ]
    );

    return mapVaccination(result.rows[0]);
  }

  async listVaccinationRecords(animalId: string): Promise<VaccinationRecord[]> {
    const result = await query<VaccinationRow>(
      `
        SELECT
          id,
          animal_id,
          case_id,
          administered_by_user_id,
          vaccine_name,
          administered_at,
          expires_at,
          batch_number,
          notes,
          verified,
          status,
          created_at
        FROM vaccination_records
        WHERE animal_id = $1
        ORDER BY administered_at DESC, created_at DESC
      `,
      [animalId]
    );

    return result.rows.map(mapVaccination);
  }

  async addMedicalHistoryEntry(input: MedicalHistoryInput): Promise<MedicalHistoryRecord> {
    const result = await query<MedicalHistoryRow>(
      `
        INSERT INTO medical_history_entries (
          animal_id,
          case_id,
          abc_event_id,
          created_by_user_id,
          entry_type,
          title,
          notes,
          provider_name,
          treatment_date,
          cost_amount,
          attachments
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          animal_id,
          case_id,
          abc_event_id,
          created_by_user_id,
          entry_type,
          title,
          notes,
          provider_name,
          treatment_date,
          cost_amount,
          attachments,
          created_at
      `,
      [
        input.animalId,
        input.caseId ?? null,
        input.abcEventId ?? null,
        input.createdByUserId ?? null,
        input.entryType,
        input.title,
        input.notes ?? null,
        input.providerName ?? null,
        input.treatmentDate,
        input.costAmount ?? null,
        input.attachments ?? []
      ]
    );

    return mapMedicalHistory(result.rows[0]);
  }

  async listMedicalHistory(animalId: string): Promise<MedicalHistoryRecord[]> {
    const result = await query<MedicalHistoryRow>(
      `
        SELECT
          id,
          animal_id,
          case_id,
          abc_event_id,
          created_by_user_id,
          entry_type,
          title,
          notes,
          provider_name,
          treatment_date,
          cost_amount,
          attachments,
          created_at
        FROM medical_history_entries
        WHERE animal_id = $1
        ORDER BY treatment_date DESC, created_at DESC
      `,
      [animalId]
    );

    return result.rows.map(mapMedicalHistory);
  }

  async listActiveCasesForAnimal(animalId: string): Promise<
    Array<{
      id: string;
      animal_id: string | null;
      reporter_user_id: string;
      assigned_to_user_id: string | null;
      case_type: "rescue" | "abuse" | "conflict" | "lost_pet" | "abc";
      status: "open" | "in_review" | "action_taken" | "resolved" | "closed" | "VERIFIED_REIMBURSEMENT";
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
    }>
  > {
    const result = await query<{
      id: string;
      animal_id: string | null;
      reporter_user_id: string;
      assigned_to_user_id: string | null;
      case_type: "rescue" | "abuse" | "conflict" | "lost_pet" | "abc";
      status: "open" | "in_review" | "action_taken" | "resolved" | "closed" | "VERIFIED_REIMBURSEMENT";
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
    }>(
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
        WHERE c.animal_id = $1
          AND c.status IN ('open', 'in_review', 'action_taken', 'VERIFIED_REIMBURSEMENT')
        ORDER BY c.updated_at DESC
      `,
      [animalId]
    );

    return result.rows;
  }

  async listAbuseFlagsForAnimal(animalId: string): Promise<AbuseFlagRecord[]> {
    const result = await query<AbuseFlagRow>(
      `
        SELECT
          id,
          case_id,
          animal_id,
          flagged_by_user_id,
          severity_score,
          pattern_key,
          reason,
          status,
          internal_notes,
          created_at
        FROM abuse_flags
        WHERE animal_id = $1
        ORDER BY created_at DESC
      `,
      [animalId]
    );

    return result.rows.map(mapAbuseFlag);
  }

  async refreshDisappearanceStates(): Promise<void> {
    await query(
      `
        UPDATE animals
        SET disappearance_risk_level = CASE
          WHEN status = 'lost' OR last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '14 days' THEN 'urgent'
          WHEN last_seen_at < NOW() - INTERVAL '5 days' THEN 'watch'
          ELSE 'stable'
        END,
        updated_at = NOW()
      `
    );
  }

  async listTerritorySummary(): Promise<
    Array<{
      territoryLabel: string;
      animalCount: number;
      urgentCount: number;
      seenTodayCount: number;
    }>
  > {
    const result = await query<TerritorySummaryRow>(
      `
        SELECT
          COALESCE(territory_label, 'Unmapped territory') AS territory_label,
          COUNT(*)::int AS animal_count,
          COUNT(*) FILTER (WHERE disappearance_risk_level = 'urgent')::int AS urgent_count,
          COALESCE(SUM(seen_today_count), 0)::int AS seen_today_total
        FROM animals
        GROUP BY COALESCE(territory_label, 'Unmapped territory')
        ORDER BY animal_count DESC, territory_label ASC
      `
    );

    return result.rows.map((row) => ({
      territoryLabel: row.territory_label ?? "Unmapped territory",
      animalCount: Number(row.animal_count),
      urgentCount: Number(row.urgent_count),
      seenTodayCount: Number(row.seen_today_total)
    }));
  }
}

export const animalRepository = new AnimalRepository();
