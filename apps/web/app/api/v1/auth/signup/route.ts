import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { requireCsrf } from "@/lib/auth-middleware";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().optional(),
});

const hashPassword = async (pw: string) => bcrypt.hash(pw, 10);

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const rate = await checkRateLimit(`signup:${ip}`, userAgent);
    if (!rate.allowed) {
      return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many signup attempts. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
    }

    const raw = await req.json();
    const parsed = validateBody(SignupSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { email, password, fullName } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabaseAdmin()
      .from("users")
      .insert({ email: normalizedEmail, password_hash: passwordHash, full_name: fullName ?? null, role: "citizen", identity_tier: 0, last_active_at: new Date().toISOString() })
      .select("id, email")
      .single();

    if (error) {
      const message = error.message ?? "Failed to create account";
      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        return new NextResponse(JSON.stringify({ success: false, code: "EMAIL_EXISTS", message: "An account with this email already exists" }), { status: 409, headers: { "Content-Type": "application/json" } });
      }
      return serverError(message);
    }
    await audit({ tableName: "users", recordId: data.id, action: "INSERT", actorId: "anonymous", actorRole: "citizen", newData: { email: data.email } });
    return ok({ email: data.email }, "Account created");
  } catch {
    return serverError("Failed to create account");
  }
}
