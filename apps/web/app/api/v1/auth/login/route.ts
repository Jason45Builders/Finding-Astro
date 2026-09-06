import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signToken, hashToken } from "@/lib/jwt";
import { ok, unauthorized, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const comparePassword = async (pw: string, hash: string) => bcrypt.compare(pw, hash);

const mapUser = (row: Record<string, unknown>) => ({
  id: row.id as string,
  phone: row.email as string,
  fullName: row.full_name as string | null,
  role: row.role as string,
  email: row.email as string,
  reputationScore: Number(row.reputation_score ?? 0),
  activeCaseLimit: Number(row.active_case_limit ?? 5),
  isAvailable: Boolean(row.is_available),
  vehicleType: (row.vehicle_type as string | null) ?? null,
  vehicleCapacity: (row.vehicle_capacity as number | null) ?? null,
  serviceRadiusKm: Number(row.service_radius_km ?? 5),
  homeLocation: row.home_location
    ? { latitude: Number((row.home_location as { y: number }).y || 0), longitude: Number((row.home_location as { x: number }).x || 0) }
    : null,
  activityCount: Number(row.activity_count ?? 0),
  completedCaseCount: Number(row.completed_case_count ?? 0),
  lastLoginAt: (row.last_login_at as string | null) ?? null,
  lastActiveAt: (row.last_active_at as string | null) ?? null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const rate = await checkRateLimit(`login:${ip}`, userAgent);
    if (!rate.allowed) {
      return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many login attempts. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
    }

    const raw = await req.json();
    const parsed = validateBody(LoginSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    const { data: row, error: fetchErr } = await supabaseAdmin()
      .from("users")
      .select("id, email, password_hash, full_name, role, reputation_score, active_case_limit, is_available, vehicle_type, vehicle_capacity, service_radius_km, home_location, activity_count, completed_case_count, last_login_at, last_active_at, created_at, updated_at, locked_until, is_banned")
      .eq("email", normalizedEmail)
      .single();

    if (fetchErr || !row) {
      await audit({ tableName: "login_attempts", recordId: "unknown", action: "LOGIN_FAILED", actorId: "anonymous", actorRole: "anonymous", newData: { reason: "user_not_found", email: normalizedEmail, ip, userAgent } });
      await supabaseAdmin().from("login_attempts").insert({ user_id: null, email: normalizedEmail, ip_address: ip, user_agent: userAgent, success: false });
      return unauthorized("Invalid credentials");
    }

    const userRow = row as Record<string, unknown>;
    if (userRow.is_banned === true) {
      return new NextResponse(JSON.stringify({ success: false, code: "ACCOUNT_BANNED", message: `This account has been suspended. Reason: ${userRow.ban_reason ?? "Violation of platform rules"}` }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const lockedUntil = userRow.locked_until ? new Date(userRow.locked_until as string) : null;
    if (lockedUntil && lockedUntil > new Date()) {
      const remainingSeconds = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      return new NextResponse(JSON.stringify({ success: false, code: "ACCOUNT_LOCKED", message: `Account locked due to too many failed attempts. Try again in ${remainingSeconds}s`, retryAfter: remainingSeconds }), { status: 423, headers: { "Content-Type": "application/json", "Retry-After": String(remainingSeconds) } });
    }

    const valid = await comparePassword(password, userRow.password_hash as string);
    if (!valid) {
      await supabaseAdmin().from("login_attempts").insert({ user_id: userRow.id as string, email: normalizedEmail, ip_address: ip, user_agent: userAgent, success: false });
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentFailures } = await supabaseAdmin().from("login_attempts").select("id").eq("user_id", userRow.id as string).eq("success", false).gte("attempted_at", fifteenMinutesAgo);
      const failureCount = (recentFailures ?? []).length + 1;
      if (failureCount >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabaseAdmin().from("users").update({ locked_until: lockUntil }).eq("id", userRow.id as string);
        await audit({ tableName: "users", recordId: userRow.id as string, action: "UPDATE", actorId: userRow.id as string, actorRole: userRow.role as string, newData: { locked_until: lockUntil, reason: "too_many_failed_logins" } });
        return new NextResponse(JSON.stringify({ success: false, code: "ACCOUNT_LOCKED", message: "Account locked for 15 minutes due to too many failed attempts", retryAfter: 900 }), { status: 423, headers: { "Content-Type": "application/json", "Retry-After": "900" } });
      }
      await audit({ tableName: "users", recordId: userRow.id as string, action: "LOGIN_FAILED", actorId: userRow.id as string, actorRole: userRow.role as string, newData: { reason: "invalid_password", email: normalizedEmail, failureCount } });
      return unauthorized("Invalid credentials");
    }

    await supabaseAdmin().from("users").update({ last_login_at: new Date().toISOString(), last_active_at: new Date().toISOString(), updated_at: new Date().toISOString(), locked_until: null }).eq("id", userRow.id as string);

    const user = mapUser(row);
    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const rawRefreshToken = crypto.randomUUID() + crypto.randomUUID();
    const refreshTokenHash = await hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin().from("refresh_tokens").insert({ user_id: user.id, token_hash: refreshTokenHash, expires_at: refreshExpiresAt });
    await supabaseAdmin().from("login_attempts").insert({ user_id: user.id, email: normalizedEmail, ip_address: ip, user_agent: userAgent, success: true });
    await audit({ tableName: "users", recordId: user.id, action: "UPDATE", actorId: user.id, actorRole: user.role, newData: { last_login_at: new Date().toISOString() } });
    return ok({ token, refreshToken: rawRefreshToken, user }, "Login successful");
  } catch {
    return serverError("Failed to process login");
  }
}
