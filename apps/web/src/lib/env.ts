if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required and must not be empty.");
}
export const JWT_SECRET = process.env.JWT_SECRET;
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const PORT = parseInt(process.env.PORT ?? "4000", 10);
export const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "";
