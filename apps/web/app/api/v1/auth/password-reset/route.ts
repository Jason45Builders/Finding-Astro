import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ok, badRequest, serverError, unauthorized, notFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const PasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1),
});

const hashPassword = async (pw: string) => bcrypt.hash(pw, 12);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const rate = await checkRateLimit(`password-reset:${ip}`, userAgent);
    if (!rate.allowed) {
      return new NextResponse(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many attempts. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "request") {
      const raw = await req.json();
      const parsed = validateBody(z.object({ email: z.string().email() }), raw);
      if (!parsed.ok) return parsed.response;
      const { email } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const { data: userRow } = await supabaseAdmin().from("users").select("id, email, role").eq("email", normalizedEmail).maybeSingle();
      const userId = userRow ? (userRow as Record<string, unknown>).id as string : null;

      if (userId) {
        const token = crypto.randomUUID() + crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await supabaseAdmin().from("password_reset_tokens").insert({ user_id: userId, token, expires_at: expiresAt });
        await audit({ tableName: "password_reset_tokens", recordId: userId, action: "INSERT", actorId: userId, actorRole: (userRow as Record<string, unknown>).role as string, newData: { reason: "forgot_password_request" } });
      }

      return ok({ email: normalizedEmail }, "If an account exists with this email, a reset link has been sent");
    }

    const raw = await req.json();
    const parsed = validateBody(PasswordSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { newPassword, confirmPassword } = parsed.data;

    if (newPassword !== confirmPassword) return badRequest("VALIDATION_ERROR", "Passwords do not match");

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return unauthorized("Missing authorization token");

    const token = authHeader.slice("Bearer ".length).trim();
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin().from("password_reset_tokens").select("user_id, expires_at, used_at").eq("token", token).is("used_at", null).maybeSingle();
    if (tokenErr || !tokenRow) return unauthorized("Invalid or expired reset token");

    if (new Date(tokenRow.expires_at) < new Date()) {
      return unauthorized("Reset token expired");
    }

    const { data: userRow } = await supabaseAdmin().from("users").select("id, role").eq("id", tokenRow.user_id).single();
    if (!userRow) return notFound("User not found");

    const passwordHash = await hashPassword(newPassword);
    const { error: updateErr } = await supabaseAdmin().from("users").update({ password_hash: passwordHash }).eq("id", tokenRow.user_id);
    if (updateErr) return serverError(updateErr.message);

    await supabaseAdmin().from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
    await supabaseAdmin().from("refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("user_id", tokenRow.user_id).is("revoked_at", null);

    await audit({ tableName: "users", recordId: tokenRow.user_id, action: "UPDATE", actorId: tokenRow.user_id, actorRole: (userRow as Record<string, unknown>).role as string, newData: { reason: "password_reset" } });
    return ok(null, "Password reset successful");
  } catch {
    return serverError("Failed to reset password");
  }
}
