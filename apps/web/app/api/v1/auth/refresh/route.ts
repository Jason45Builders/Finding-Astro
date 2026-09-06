import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signToken, hashToken, verifyToken } from "@/lib/jwt";
import { ok, unauthorized, serverError } from "@/lib/api-response";
import { validateBody } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

const RefreshSchema = z.object({ refreshToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const rate = await checkRateLimit(`refresh:${ip}`, userAgent);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ success: false, code: "RATE_LIMITED", message: `Too many requests. Retry after ${rate.retryAfter}s` }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter) } });
  }

  try {
    const raw = await req.json();
    const parsed = validateBody(RefreshSchema, raw);
    if (!parsed.ok) return parsed.response;
    const { refreshToken } = parsed.data;

    const tokenHash = await hashToken(refreshToken);

    const { data: stored, error: fetchError } = await supabaseAdmin()
      .from("refresh_tokens")
      .select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (fetchError || !stored) return unauthorized("Invalid refresh token");

    if (new Date(stored.expires_at) < new Date()) {
      await supabaseAdmin().from("refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", stored.id);
      return unauthorized("Refresh token expired");
    }

    const { data: userRow } = await supabaseAdmin().from("users").select("id, email, role").eq("id", stored.user_id).single();
    if (!userRow) return unauthorized("User not found");

    const newAccessToken = await signToken({ sub: userRow.id, email: userRow.email, role: userRow.role });
    const newRefreshToken = crypto.randomUUID() + crypto.randomUUID();
    const newRefreshHash = await hashToken(newRefreshToken);
    const newRefreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin().from("refresh_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", stored.id);
    await supabaseAdmin().from("refresh_tokens").insert({ user_id: userRow.id, token_hash: newRefreshHash, expires_at: newRefreshExpiresAt });

    await audit({ tableName: "refresh_tokens", recordId: stored.id, action: "UPDATE", actorId: userRow.id, actorRole: userRow.role, newData: { action: "refresh" } });

    return ok({ token: newAccessToken, refreshToken: newRefreshToken }, "Token refreshed");
  } catch {
    return serverError("Failed to refresh token");
  }
}
