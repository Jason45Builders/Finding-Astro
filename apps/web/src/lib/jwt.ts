import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "./env";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export async function signToken(payload: TokenPayload, expiresIn = "7d"): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: payload.sub, email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as TokenPayload;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
