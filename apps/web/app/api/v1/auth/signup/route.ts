import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { JWT_SECRET } from "@/lib/env";
import { ok, unauthorized, serverError } from "@/lib/api-response";

const hashPassword = async (pw: string) => bcrypt.hash(pw, 10);
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
    const { email, password, fullName } = body as Record<string, string>;

    if (!email || !password) return new Response(JSON.stringify({ success: false, code: "VALIDATION_ERROR", message: "Email and password required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert({ email: normalizedEmail, password_hash: passwordHash, full_name: fullName ?? null, role: "citizen", identity_tier: 0, last_active_at: new Date().toISOString() }, { onConflict: "email" })
      .select("id, email")
      .single();

    if (error) return serverError(error.message);
    return ok({ email: data.email }, "Account created");
  } catch {
    return serverError("Failed to create account");
  }
}
