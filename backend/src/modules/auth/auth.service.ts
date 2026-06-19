/**
 * auth.service.ts — SECURED
 * Role removed from OTP signup. OTP attempt lockout after 5 wrong tries.
 * Mock OTP never leaks in production.
 */

import crypto from "node:crypto";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { query } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";
import { AuthenticatedUser, UserRecord, UserRole } from "../../types/global.types";
import { notificationService } from "../notifications/notification.service";
import { getSmsAdapter } from "../../integrations";

const MAX_OTP_ATTEMPTS = 5;

interface UserRow {
  id: string;
  phone: string;
  full_name: string | null;
  role: UserRole;
  otp_code: string | null;
  otp_expires_at: Date | null;
  otp_attempts: number;
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
  phone: string;
  role: UserRole;
}

const userSelect = `
  SELECT
    u.id, u.phone, u.full_name, u.role,
    u.otp_code, u.otp_expires_at,
    COALESCE(u.otp_attempts, 0) AS otp_attempts,
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
      ? { latitude: Number(row.home_latitude), longitude: Number(row.home_longitude) }
      : null,
  activityCount: row.activity_count,
  completedCaseCount: row.completed_case_count,
  lastLoginAt: row.last_login_at,
  lastActiveAt: row.last_active_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
};

const generateOtp = (): string => crypto.randomInt(100_000, 1_000_000).toString();

export const signToken = (user: UserRecord): string =>
  jwt.sign(
    { sub: user.id, phone: user.phone, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] }
  );

export const verifyToken = (token: string): AuthenticatedUser => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  return { id: decoded.sub, phone: decoded.phone, role: decoded.role };
};

class AuthService {
  async requestOtp(
    phone: string,
    fullName?: string
  ): Promise<{ phone: string; expiresInMinutes: number; code?: string }> {
    const normalizedPhone = normalizePhone(phone);
    const otpCode = generateOtp();

    // Role is NEVER accepted from the client — all new accounts are citizens.
    // Existing accounts keep their current role.
    await query(
      `
        INSERT INTO users (phone, full_name, role, otp_code, otp_expires_at, otp_attempts, last_active_at)
        VALUES ($1, $2, 'citizen', $3, NOW() + ($4 || ' minutes')::interval, 0, NOW())
        ON CONFLICT (phone)
        DO UPDATE SET
          full_name      = COALESCE(EXCLUDED.full_name, users.full_name),
          otp_code       = EXCLUDED.otp_code,
          otp_expires_at = EXCLUDED.otp_expires_at,
          otp_attempts   = 0,
          last_active_at = NOW(),
          updated_at     = NOW()
      `,
      [normalizedPhone, fullName ?? null, otpCode, env.OTP_TTL_MINUTES]
    );

    const isDev = env.NODE_ENV !== "production" && env.SHOW_MOCK_OTP;

    // Send OTP via SMS adapter (mock in dev, real provider in production)
    try {
      const smsAdapter = getSmsAdapter();
      await smsAdapter.sendOtp(normalizedPhone, otpCode);
    } catch (err) {
      // Log but don't fail the request — the user can still receive OTP via dev console
      console.warn("[AuthService] SMS delivery failed:", err);
    }

    return {
      phone: normalizedPhone,
      expiresInMinutes: env.OTP_TTL_MINUTES,
      ...(isDev ? { code: otpCode } : {}),
    };
  }

  async verifyOtp(phone: string, code: string): Promise<{ token: string; user: UserRecord }> {
    const normalizedPhone = normalizePhone(phone);

    const result = await query<UserRow>(`${userSelect} WHERE u.phone = $1 LIMIT 1`, [normalizedPhone]);
    const row = result.rows[0];

    if (!row || !row.otp_code || !row.otp_expires_at) {
      throw new AppError("OTP request not found", 404, "OTP_NOT_FOUND");
    }

    // Lockout after MAX_OTP_ATTEMPTS
    if (row.otp_attempts >= MAX_OTP_ATTEMPTS) {
      throw new AppError(
        "Too many incorrect attempts. Request a new OTP.",
        429,
        "OTP_LOCKED"
      );
    }

    if (row.otp_expires_at.getTime() < Date.now()) {
      throw new AppError("OTP has expired", 401, "OTP_EXPIRED");
    }

    if (row.otp_code !== code) {
      await query(
        `UPDATE users SET otp_attempts = otp_attempts + 1, updated_at = NOW() WHERE id = $1`,
        [row.id]
      );
      const remaining = MAX_OTP_ATTEMPTS - (row.otp_attempts + 1);
      throw new AppError(
        `Invalid OTP. ${remaining} attempt(s) remaining.`,
        401,
        "INVALID_OTP"
      );
    }

    const updated = await query<UserRow>(
      `
        UPDATE users
        SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0,
            last_login_at = NOW(), last_active_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING
          id, phone, full_name, role, otp_code, otp_expires_at, 0 AS otp_attempts,
          last_login_at, reputation_score, active_case_limit, is_available,
          vehicle_type, vehicle_capacity, service_radius_km,
          ST_Y(home_location::geometry) AS home_latitude,
          ST_X(home_location::geometry) AS home_longitude,
          activity_count, completed_case_count, last_active_at, created_at, updated_at
      `,
      [row.id]
    );

    const user = mapUser(updated.rows[0]);
    const token = signToken(user);

    await notificationService.notifyUser(
      user.id, "auth", "Login successful",
      "Welcome to Finding Astro.",
      { phone: user.phone, role: user.role }
    );

    return { token, user };
  }

  async getProfile(userId: string): Promise<UserRecord> {
    const result = await query<UserRow>(`${userSelect} WHERE u.id = $1 LIMIT 1`, [userId]);
    const row = result.rows[0];
    if (!row) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return mapUser(row);
  }
}

export const authService = new AuthService();
