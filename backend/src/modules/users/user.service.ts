import { query, withTransaction } from "../../config/db";
import { AppError } from "../../middleware/error.middleware";
import {
  LocationInput,
  RescueRouteCandidate,
  UserRecord,
  UserRole,
  VolunteerActivityRecord
} from "../../types/global.types";
import { clamp } from "../../utils/geo.utils";

interface UserRow {
  id: string;
  phone: string;
  full_name: string | null;
  role: UserRole;
  reputation_score: string | number;
  active_case_limit: number;
  is_available: boolean;
  vehicle_type: string | null;
  vehicle_capacity: number | null;
  service_radius_km: string | number;
  home_latitude: number | null;
  home_longitude: number | null;
  activity_count: number;
  completed_case_count: number;
  last_login_at: Date | null;
  last_active_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ResponderRow extends UserRow {
  distance_km: number;
  active_case_load: number;
}

interface VolunteerActivityRow {
  id: string;
  user_id: string;
  activity_type: string;
  reference_id: string | null;
  points_delta: number;
  notes: string | null;
  created_at: Date;
}

const userSelect = `
  SELECT
    u.id,
    u.phone,
    u.full_name,
    u.role,
    u.reputation_score,
    u.active_case_limit,
    u.is_available,
    u.vehicle_type,
    u.vehicle_capacity,
    u.service_radius_km,
    ST_Y(u.home_location::geometry) AS home_latitude,
    ST_X(u.home_location::geometry) AS home_longitude,
    u.activity_count,
    u.completed_case_count,
    u.last_login_at,
    u.last_active_at,
    u.created_at,
    u.updated_at
  FROM users u
`;

const mapUser = (row: UserRow): UserRecord => ({
  id: row.id,
  phone: row.phone,
  fullName: row.full_name,
  role: row.role,
  reputationScore: Number(row.reputation_score),
  activeCaseLimit: row.active_case_limit,
  isAvailable: row.is_available,
  vehicleType: row.vehicle_type,
  vehicleCapacity: row.vehicle_capacity,
  serviceRadiusKm: Number(row.service_radius_km),
  homeLocation:
    row.home_latitude !== null && row.home_longitude !== null
      ? {
          latitude: Number(row.home_latitude),
          longitude: Number(row.home_longitude)
        }
      : null,
  activityCount: row.activity_count,
  completedCaseCount: row.completed_case_count,
  lastLoginAt: row.last_login_at,
  lastActiveAt: row.last_active_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapActivity = (row: VolunteerActivityRow): VolunteerActivityRecord => ({
  id: row.id,
  userId: row.user_id,
  activityType: row.activity_type,
  referenceId: row.reference_id,
  pointsDelta: row.points_delta,
  notes: row.notes,
  createdAt: row.created_at
});

const buildRouteCandidate = (row: ResponderRow): RescueRouteCandidate => {
  const user = mapUser(row);
  const workloadPenalty =
    row.active_case_load >= user.activeCaseLimit ? 25 : (row.active_case_load / user.activeCaseLimit) * 15;
  const distanceScore = Math.max(0, 35 - Number(row.distance_km) * 4.5);
  const reputationScore = Number(user.reputationScore) * 0.45;
  const routeScore = clamp(
    Math.round(distanceScore + reputationScore + 22 - workloadPenalty),
    1,
    99
  );

  return {
    user,
    distanceKm: Number(Number(row.distance_km).toFixed(2)),
    activeCaseLoad: Number(row.active_case_load),
    reputationScore: Number(user.reputationScore),
    routeScore,
    reason:
      routeScore >= 75
        ? "Closest available responder with strong reputation and workable case load."
        : "Responder fits the geography and capacity requirements, but with moderate workload or distance."
  };
};

export interface VolunteerProfileUpdateInput {
  fullName?: string | null;
  isAvailable?: boolean;
  activeCaseLimit?: number;
  vehicleType?: string | null;
  vehicleCapacity?: number | null;
  serviceRadiusKm?: number;
  homeLocation?: LocationInput | null;
}

class UserService {
  async listUsers(): Promise<UserRecord[]> {
    const result = await query<UserRow>(`${userSelect} ORDER BY u.created_at DESC`);
    return result.rows.map(mapUser);
  }

  async getUserById(userId: string): Promise<UserRecord> {
    const result = await query<UserRow>(`${userSelect} WHERE u.id = $1 LIMIT 1`, [userId]);
    const user = result.rows[0];
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return mapUser(user);
  }

  async ensureHospitalUser(userId: string): Promise<UserRecord> {
    const user = await this.getUserById(userId);
    if (user.role !== "hospital") {
      throw new AppError("The selected provider is not a hospital account", 400, "INVALID_HOSPITAL");
    }
    return user;
  }

  async countRecentReimbursementRequests(userId: string, days: number): Promise<number> {
    const result = await query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM reimbursement_requests
        WHERE volunteer_id = $1
          AND created_at >= NOW() - ($2 || ' days')::interval
          AND status IN ('PENDING_VERIFICATION', 'VERIFIED')
      `,
      [userId, days]
    );
    return Number(result.rows[0]?.count ?? "0");
  }

  async getVolunteerProfile(userId: string): Promise<UserRecord> {
    return this.getUserById(userId);
  }

  async updateVolunteerProfile(userId: string, input: VolunteerProfileUpdateInput): Promise<UserRecord> {
    const updates: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    const pushValue = (column: string, value: string | number | boolean | null): void => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (input.fullName !== undefined)       pushValue("full_name", input.fullName);
    if (input.isAvailable !== undefined)    pushValue("is_available", input.isAvailable);
    if (input.activeCaseLimit !== undefined) pushValue("active_case_limit", input.activeCaseLimit);
    if (input.vehicleType !== undefined)    pushValue("vehicle_type", input.vehicleType);
    if (input.vehicleCapacity !== undefined) pushValue("vehicle_capacity", input.vehicleCapacity);
    if (input.serviceRadiusKm !== undefined) pushValue("service_radius_km", input.serviceRadiusKm);

    if (input.homeLocation !== undefined) {
      if (input.homeLocation === null) {
        updates.push("home_location = NULL");
      } else {
        values.push(input.homeLocation.longitude);
        const longitudeIndex = values.length;
        values.push(input.homeLocation.latitude);
        const latitudeIndex = values.length;
        updates.push(
          `home_location = ST_SetSRID(ST_MakePoint($${longitudeIndex}, $${latitudeIndex}), 4326)::geography`
        );
      }
    }

    if (!updates.length) return this.getUserById(userId);

    values.push(userId);
    await query(
      `UPDATE users SET ${updates.join(", ")}, last_active_at = NOW(), updated_at = NOW() WHERE id = $${values.length}`,
      values
    );
    return this.getUserById(userId);
  }

  async getResponderCandidates(
    location: LocationInput,
    caseType: UserRole | "rescue" | "abuse" | "abc" | "conflict" | "lost_pet",
    limit = 5
  ): Promise<RescueRouteCandidate[]> {
    const includeHospitals = caseType === "rescue" || caseType === "abc" || caseType === "lost_pet";
    const allowedRoles = includeHospitals
      ? ["citizen", "ngo", "govt", "admin", "hospital"]
      : ["citizen", "ngo", "govt", "admin"];

    const result = await query<ResponderRow>(
      `
        SELECT
          u.id, u.phone, u.full_name, u.role, u.reputation_score, u.active_case_limit,
          u.is_available, u.vehicle_type, u.vehicle_capacity, u.service_radius_km,
          ST_Y(u.home_location::geometry) AS home_latitude,
          ST_X(u.home_location::geometry) AS home_longitude,
          u.activity_count, u.completed_case_count, u.last_login_at, u.last_active_at,
          u.created_at, u.updated_at,
          ST_Distance(u.home_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 AS distance_km,
          COUNT(c.id)::int AS active_case_load
        FROM users u
        LEFT JOIN cases c
          ON c.assigned_to_user_id = u.id
         AND c.status IN ('open', 'in_review', 'action_taken', 'VERIFIED_REIMBURSEMENT')
        WHERE u.is_available = TRUE
          AND u.home_location IS NOT NULL
          AND u.role = ANY($3::user_role[])
          AND ST_DWithin(u.home_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, u.service_radius_km * 1000)
        GROUP BY u.id
        HAVING COUNT(c.id)::int < u.active_case_limit
        ORDER BY distance_km ASC, u.reputation_score DESC, u.completed_case_count DESC
        LIMIT $4
      `,
      [location.longitude, location.latitude, allowedRoles, limit]
    );

    return result.rows.map(buildRouteCandidate);
  }

  async recordVolunteerActivity(
    userId: string,
    activityType: string,
    referenceId: string | null,
    pointsDelta: number,
    notes?: string | null
  ): Promise<VolunteerActivityRecord> {
    return withTransaction(async (client) => {
      const activityResult = await client.query<VolunteerActivityRow>(
        `
          INSERT INTO volunteer_activity_logs (user_id, activity_type, reference_id, points_delta, notes)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, user_id, activity_type, reference_id, points_delta, notes, created_at
        `,
        [userId, activityType, referenceId, pointsDelta, notes ?? null]
      );

      const completedIncrement =
        activityType === "case_resolved" || activityType === "transport_completed" ? 1 : 0;

      await client.query(
        `
          UPDATE users
          SET
            activity_count = activity_count + 1,
            reputation_score = GREATEST(0, LEAST(100, reputation_score + $1)),
            completed_case_count = completed_case_count + $2,
            last_active_at = NOW(),
            updated_at = NOW()
          WHERE id = $3
        `,
        [pointsDelta, completedIncrement, userId]
      );

      return mapActivity(activityResult.rows[0]);
    });
  }

  async listVolunteerActivity(userId: string, limit = 25): Promise<VolunteerActivityRecord[]> {
    const result = await query<VolunteerActivityRow>(
      `
        SELECT id, user_id, activity_type, reference_id, points_delta, notes, created_at
        FROM volunteer_activity_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userId, limit]
    );
    return result.rows.map(mapActivity);
  }

  async touchUserActivity(userId: string): Promise<void> {
    await query(
      `UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  // Add reputation points — called by animal.service after sightings, vaccinations etc.
  async addReputationPoints(userId: string, points: number): Promise<void> {
    await query(
      `UPDATE users SET reputation_score = GREATEST(0, LEAST(100, reputation_score + $1)), updated_at = NOW() WHERE id = $2`,
      [points, userId]
    );
  }

  // Lightweight activity logger
  async logActivity(
    userId: string,
    activityType: string,
    referenceId?: string | null,
    points = 0,
    notes?: string | null
  ): Promise<void> {
    await this.recordVolunteerActivity(userId, activityType, referenceId ?? null, points, notes);
  }

  // Decrement credibility — called by false-report-prevention service
  async decrementCredibility(userId: string, points = 15): Promise<void> {
    await query(
      `UPDATE users SET report_credibility_score = GREATEST(0, report_credibility_score - $1), updated_at = NOW() WHERE id = $2`,
      [points, userId]
    );
  }

  // Increment credibility — called when a report is confirmed accurate by NGO
  async incrementCredibility(userId: string, points = 5): Promise<void> {
    await query(
      `UPDATE users SET report_credibility_score = LEAST(100, report_credibility_score + $1), updated_at = NOW() WHERE id = $2`,
      [points, userId]
    );
  }
}

export const userService = new UserService();
