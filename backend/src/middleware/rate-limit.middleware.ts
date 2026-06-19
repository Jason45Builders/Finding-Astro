/**
 * rate-limit.middleware.ts
 * app.ts imports this but it didn't exist — causing the backend to crash on startup.
 * This is the file that unblocks everything.
 *
 * INSTALL FIRST:  cd backend && npm install express-rate-limit
 */

import rateLimit from "express-rate-limit";

const json = (code: string, message: string) => ({
  success: false,
  code,
  message,
});

// Strict OTP limit — 5 per IP per 15 min. Prevents SMS spam + brute force.
export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: json(
    "RATE_LIMITED",
    "Too many OTP requests from this device. Please wait 15 minutes."
  ),
  skipSuccessfulRequests: false,
});

// Reporting limit — 20 new case submissions per hour per IP
export const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: json(
    "RATE_LIMITED",
    "Too many reports submitted. Please try again in an hour."
  ),
});

// Upload limit — 50 uploads per hour per IP
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: json(
    "RATE_LIMITED",
    "Upload limit reached for this hour. Please try again later."
  ),
});

// Global ceiling — 300 requests per 15 min per IP. Applied in app.ts globally.
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("RATE_LIMITED", "Request limit exceeded. Please slow down."),
  skip: (req) => req.path === "/health",
});
