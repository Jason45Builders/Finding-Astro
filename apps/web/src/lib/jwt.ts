import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "./env";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: payload.sub, email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as TokenPayload;
}
