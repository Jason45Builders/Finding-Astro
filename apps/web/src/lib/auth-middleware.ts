import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  identityTier?: number;
}

const TIER_NAMES = [
  "phone only", "registered name", "Aadhaar verified",
  "verified organisation", "government", "admin",
];

export async function authMiddleware(req: NextRequest): Promise<{ user: AuthenticatedUser } | { error: Response }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ success: false, code: "UNAUTHORIZED", message: "Authentication required" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const admin = supabaseAdmin();

   try {
     let payload;
     try {
       payload = await verifyToken(token);
     } catch {
       return { error: new Response(JSON.stringify({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
     }

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("is_banned, ban_reason, identity_tier, role")
      .eq("id", payload.sub)
      .single();

    if (userError || !userRow) {
      return { error: new Response(JSON.stringify({ success: false, code: "ACCOUNT_NOT_FOUND", message: "Account not found" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
    }

    if (userRow.is_banned) {
      return {
        error: new Response(JSON.stringify({
          success: false,
          code: "ACCOUNT_BANNED",
          message: `This account has been suspended. Reason: ${userRow.ban_reason ?? "Violation of platform rules"}. Contact support if you believe this is an error.`,
        }), { status: 403, headers: { "Content-Type": "application/json" } }),
      };
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        role: userRow.role,
        identityTier: userRow.identity_tier ?? 0,
      },
    };
  } catch {
    return { error: new Response(JSON.stringify({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" }), { status: 401, headers: { "Content-Type": "application/json" } }) };
  }
}

export async function optionalAuth(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  const admin = supabaseAdmin();
  try {
    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      return null;
    }

    const { data: userRow } = await admin
      .from("users")
      .select("is_banned, identity_tier, role")
      .eq("id", payload.sub)
      .single();

    if (userRow?.is_banned) {
      return null;
    }
    if (userRow) {
      return { id: payload.sub, email: payload.email, role: userRow.role, identityTier: userRow.identity_tier ?? 0 };
    }
    return { id: payload.sub, email: payload.email, role: "citizen" };
  } catch {
    return null;
  }
}

export function requireRole(user: AuthenticatedUser, ...allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Insufficient permissions`);
  }
}

export function requireTier(user: AuthenticatedUser, minimumTier: number): void {
  const userTier = user.identityTier ?? 0;
  if (userTier < minimumTier) {
    const required = TIER_NAMES[minimumTier] ?? `tier ${minimumTier}`;
    const current = TIER_NAMES[userTier] ?? `tier ${userTier}`;
    throw new Error(`IDENTITY_TIER_REQUIRED: This action requires ${required} identity verification. Your current level is ${current}.`);
  }
}
