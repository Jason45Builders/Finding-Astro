import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV:             z.enum(["development", "test", "production"]).default("development"),
  PORT:                 z.coerce.number().int().positive().default(4000),
  DATABASE_URL:         z.string().min(1),

  JWT_SECRET:           z.string().min(32, "JWT_SECRET must be at least 32 chars. Run: openssl rand -hex 32"),
  JWT_EXPIRES_IN:       z.string().min(2).default("7d"),

  CORS_ORIGIN:          z.string().default("http://localhost:3000"),

  // Identity verification — Aadhaar hash salt (never store raw Aadhaar numbers)
  AADHAAR_HASH_SALT:    z.string().min(16).default("dev-salt-change-in-production-min-32-chars"),

  // Cloudflare R2
  R2_ACCOUNT_ID:        z.string().optional(),
  R2_ACCESS_KEY_ID:     z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME:       z.string().default("finding-astro-media"),
  R2_PUBLIC_CDN_URL:    z.string().optional(),

  // Payment
  PAYMENT_PROVIDER:     z.enum(["razorpay", "stripe", "mock"]).default("mock"),
  RAZORPAY_KEY_ID:      z.string().optional(),
  RAZORPAY_SECRET:      z.string().optional(),
  STRIPE_SECRET_KEY:    z.string().optional(),

  // SMS
  SMS_PROVIDER:         z.enum(["exotel", "fast2sms", "mock", "none"]).default("mock"),
  EXOTEL_API_KEY:       z.string().optional(),
  EXOTEL_API_TOKEN:     z.string().optional(),
  EXOTEL_SID:           z.string().optional(),
  FAST2SMS_API_KEY:     z.string().optional(),

  // Aadhaar / Identity
  AADHAAR_PROVIDER:     z.enum(["digilocker", "mock"]).default("mock"),

  // Maps
  MAPS_PROVIDER:        z.enum(["google", "mapbox", "mock"]).default("mock"),
  GOOGLE_MAPS_API_KEY:  z.string().optional(),
  MAPBOX_ACCESS_TOKEN:  z.string().optional(),

  // Expo Push
  EXPO_ACCESS_TOKEN:    z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  parsed.error.errors.forEach((e) => console.error(`   ${e.path.join(".")}: ${e.message}`));
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production") {
  if (!parsed.data.R2_ACCOUNT_ID)               console.warn("⚠️  R2_ACCOUNT_ID not set — file uploads disabled");
  if (!parsed.data.EXPO_ACCESS_TOKEN)            console.warn("⚠️  EXPO_ACCESS_TOKEN not set — push notifications disabled");
  if (parsed.data.AADHAAR_HASH_SALT.startsWith("dev-")) console.warn("⚠️  AADHAAR_HASH_SALT is using the dev default — set a real value in production");
  if (parsed.data.PAYMENT_PROVIDER === "mock")   console.warn("⚠️  PAYMENT_PROVIDER is 'mock' — no real payments will be processed");
  if (parsed.data.MAPS_PROVIDER === "mock")      console.warn("⚠️  MAPS_PROVIDER is 'mock' — using fake map data");
}

export const env = parsed.data;