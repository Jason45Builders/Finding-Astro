import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { JWT_SECRET } from "@/lib/env";
import { ok, unauthorized, serverError } from "@/lib/api-response";

const comparePassword = async (pw: string, hash: string) => bcrypt.compare(pw, hash);
const signToken = (userId: string, email: string, role: string) =>
  jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: "7d" });

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
    const body = await req.json();
    const { email, password } = body as Record<string, string>;

    if (!email || !password) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "Email and password required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const normalizedEmail = email.toLowerCase().trim();

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash, full_name, role, reputation_score, active_case_limit, is_available, vehicle_type, vehicle_capacity, service_radius_km, home_location, activity_count, completed_case_count, last_login_at, last_active_at, created_at, updated_at")
      .eq("email", normalizedEmail)
      .single();

    if (fetchErr || !row) return unauthorized("Invalid credentials");

    const valid = await comparePassword(password, row.password_hash as string);
    if (!valid) return unauthorized("Invalid credentials");

    await supabaseAdmin
      .from("users")
      .update({ last_login_at: new Date().toISOString(), last_active_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", row.id);

    const user = mapUser(row);
    const token = signToken(user.id, user.email, user.role);
    return ok({ token, user }, "Login successful");
  } catch {
    return serverError("Failed to process login");
  }
}
