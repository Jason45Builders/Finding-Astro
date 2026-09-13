import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, serverError, badRequest } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const NgoSignupSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  orgName: z.string().min(1, "Organization name is required"),
  orgType: z.string().default("ngo"),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
});

const hashPassword = async (pw: string) => bcrypt.hash(pw, 10);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const rate = await checkRateLimit(`ngo-signup:${ip}`, userAgent);
    if (!rate.allowed) {
      return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many signup attempts. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
    }

    const raw = await req.json();
    const parsed = validateBody(NgoSignupSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { fullName, email, password, orgName, orgType, registrationNumber, address, phone, website } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    const { data: user, error: userError } = await supabaseAdmin()
      .from("users")
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: fullName,
        role: "ngo",
        identity_tier: 3,
        last_active_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (userError) {
      const message = userError.message ?? "Failed to create account";
      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        return new NextResponse(JSON.stringify({ success: false, code: "EMAIL_EXISTS", message: "An account with this email already exists" }), { status: 409, headers: { "Content-Type": "application/json" } });
      }
      return serverError(message);
    }

    const { data: org, error: orgError } = await supabaseAdmin()
      .from("welfare_orgs")
      .insert({
        name: orgName,
        org_type: orgType,
        address: address ?? null,
        phone: phone ?? null,
        email: normalizedEmail,
        website: website ?? null,
        is_verified: false,
        is_active: true,
      })
      .select("id")
      .single();

    if (orgError || !org) {
      await supabaseAdmin().from("users").delete().eq("id", user.id);
      return serverError("Failed to create organization profile");
    }

    await supabaseAdmin().from("welfare_org_admins").insert({
      welfare_group_id: org.id,
      user_id: user.id,
    });

    await supabaseAdmin().from("organization_members").insert({
      welfare_group_id: org.id,
      user_id: user.id,
      org_role: "org_admin",
      permissions: { "*": true },
      is_active: true,
    });

    await audit({ tableName: "users", recordId: user.id, action: "INSERT", actorId: user.id, actorRole: "ngo", newData: { email: normalizedEmail, role: "ngo", org_id: org.id } });

    return ok({ email: normalizedEmail, orgId: org.id }, "Organization account created");
  } catch {
    return serverError("Failed to create account");
  }
}