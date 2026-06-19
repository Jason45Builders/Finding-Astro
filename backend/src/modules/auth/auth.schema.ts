import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(20)
  .regex(/^\+?[\d\s\-().]{10,20}$/, "Enter a valid phone number");

// SECURITY FIX: `role` field completely removed.
// All new accounts are citizens. Role upgrades require admin approval via /auth/org-verification/approve
export const requestOtpSchema = z.object({
  phone:    phoneSchema,
  fullName: z.string().trim().min(2).max(120).optional(),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code:  z.string().trim().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(200),
});
