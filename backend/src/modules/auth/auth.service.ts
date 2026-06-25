import bcrypt from "bcrypt";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { query } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser, UserRecord, UserRole } from "../../types/global.types";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: UserRole;
  last_login_at: Date | null;
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
  last_active_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const userSelect = `
  SELECT
    u.id, u.email, u.password_hash, u.full_name, u.role,
    u.last_login_at, u.reputation_score, u.active_case_limit,
    u.is_available, u.vehicle_type, u.vehicle_capacity, u.service_radius_km,
    ST_Y(u.home_location::geometry) AS home_latitude,
    ST_X(u.home_location::geometry) AS home_longitude,
    u.activity_count, u.completed_case_count,
    u.last_active_at, u.created_at, u.updated_at
  FROM users u
`;

const mapUser = (row: UserRow): UserRecord => ({
  id: row.id,
  phone: row.email,
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
      ? { latitude: Number(row.home_latitude), longitude: Number(row.home_longitude) }
      : null,
  activityCount: row.activity_count,
  completedCaseCount: row.completed_case_count,
  lastLoginAt: row.last_login_at,
  lastActiveAt: row.last_active_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const signToken = (user: UserRecord): string =>
  jwt.sign(
    { sub: user.id, email: user.phone, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] }
  );

export const verifyToken = (token: string): AuthenticatedUser => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  return { id: decoded.sub, phone: decoded.email, role: decoded.role };
};

class AuthService {
  async signup(
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ email: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    await query(
      `
        INSERT INTO users (email, password_hash, full_name, role, identity_tier, last_active_at)
        VALUES ($1, $2, $3, 'citizen', 0, NOW())
        ON CONFLICT (email) DO NOTHING
      `,
      [normalizedEmail, passwordHash, fullName ?? null]
    );

    return { email: normalizedEmail };
  }

  async login(email: string, password: string): Promise<{ token: string; user: UserRecord }> {
    const normalizedEmail = email.toLowerCase().trim();

    const result = await query<UserRow>(`${userSelect} WHERE u.email = $1 LIMIT 1`, [normalizedEmail]);
    const row = result.rows[0];

    if (!row) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isValid = await comparePassword(password, row.password_hash);
    if (!isValid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const updated = await query<UserRow>(
      `
        UPDATE users
        SET last_login_at = NOW(), last_active_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING
          id, email, password_hash, full_name, role,
          last_login_at, reputation_score, active_case_limit, is_available,
          vehicle_type, vehicle_capacity, service_radius_km,
          ST_Y(home_location::geometry) AS home_latitude,
          ST_X(home_location::geometry) AS home_longitude,
          activity_count, completed_case_count, last_active_at, created_at, updated_at
      `,
      [row.id]
    );

    const user = mapUser(updated.rows[0]);
    const { password_hash: _, ...userWithoutPassword } = updated.rows[0];
    const userRecord = mapUser({ ...updated.rows[0], ...userWithoutPassword });

    const token = signToken(userRecord);

    return { token, user: userRecord };
  }

  async getProfile(userId: string): Promise<UserRecord> {
    const result = await query<UserRow>(`${userSelect} WHERE u.id = $1 LIMIT 1`, [userId]);
    const row = result.rows[0];
    if (!row) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return mapUser(row);
  }
}

export const authService = new AuthService();