import jwt from "jsonwebtoken";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, JWT_SECRET) as TokenPayload;
