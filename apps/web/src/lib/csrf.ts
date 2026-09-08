import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const CSRF_COOKIE = "fa_csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getCsrfToken(req: NextRequest): string | null {
  const header = req.headers.get(CSRF_HEADER);
  if (header && header.trim() !== "") return header.trim();
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (cookie && cookie.trim() !== "") return cookie.trim();
  return null;
}

export function validateCsrf(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null;
  const token = getCsrfToken(req);
  if (!token || token.length < 16) {
    return NextResponse.json({ success: false, code: "CSRF_INVALID", message: "Invalid CSRF token" }, { status: 403 });
  }
  return null;
}

export function setCsrfCookie(res: NextResponse): NextResponse {
  const token = randomUUID();
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${CSRF_COOKIE}=${token}; Path=/; Max-Age=86400; SameSite=Lax; ${isProd ? "Secure; " : ""}HttpOnly`;
  res.headers.append("Set-Cookie", cookie);
  res.headers.append(CSRF_HEADER, token);
  return res;
}
