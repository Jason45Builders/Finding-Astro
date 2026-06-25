import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string(),
});

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(200),
});