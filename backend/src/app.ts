import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimit } from "./middleware/rate-limit.middleware";
import abcRoutes from "./modules/abc/abc.routes";
import adminRoutes from "./modules/admin/admin.routes";
import aiRoutes from "./modules/ai/ai.routes";
import animalRoutes from "./modules/animals/animal.routes";
import authRoutes from "./modules/auth/auth.routes";
import caseRoutes from "./modules/cases/case.routes";
import emergencyResponseRoutes from "./modules/cases/emergency-response.routes";
import { wildlifeRouter, safetyRouter } from "./modules/cases/wildlife.routes";
import conflictRoutes from "./modules/conflict/conflict.routes";
import fundingRoutes from "./modules/funding/funding.routes";
import { adoptionRouter, csrRouter, recoveryRouter } from "./modules/funding/adoption.routes";
import legalRoutes from "./modules/legal/legal.routes";
import mediaRoutes from "./modules/media/media.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import partnersRoutes from "./modules/partners/partners.routes";
import userRoutes from "./modules/users/user.routes";
import { checkDbHealth } from "./config/db";

export const app = express();

const ALLOWED_ORIGINS = env.CORS_ORIGIN.split(",").map(o => o.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.NODE_ENV === "development") return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed`));
  },
  credentials: false,
}));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(apiRateLimit);

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  const db = await checkDbHealth();
  res.status(db.ok ? 200 : 503).json({
    success: db.ok,
    service: "finding-astro-backend",
    environment: env.NODE_ENV,
    db: { ok: db.ok, latencyMs: db.latencyMs },
    timestamp: new Date().toISOString(),
  });
});

// ── All routes ─────────────────────────────────────────────────────────────────
app.use("/api/v1/admin",          adminRoutes);              // admin dashboard operations
app.use("/api/v1/dashboard",      adminRoutes);              // dashboard stats and alerts
app.use("/api/v1/auth",          authRoutes);
app.use("/api/v1/users",         userRoutes);
app.use("/api/v1/animals",       animalRoutes);
app.use("/api/v1/cases",         caseRoutes);
app.use("/api/v1/emergency",     emergencyResponseRoutes);   // claim, respond, escalate
app.use("/api/v1/wildlife",      wildlifeRouter);            // wildlife rescue (separate flow)
app.use("/api/v1/safety",        safetyRouter);              // "I feel unsafe", zones, QR, outcomes
app.use("/api/v1/abc",           abcRoutes);
app.use("/api/v1/ai",            aiRoutes);
app.use("/api/v1/funding",       fundingRoutes);
app.use("/api/v1/adoption",      adoptionRouter);            // curated adoption pipeline
app.use("/api/v1/csr",           csrRouter);                 // CSR sponsors + matching fund
app.use("/api/v1/recovery",      recoveryRouter);            // recovery funding + transport slabs
app.use("/api/v1/partners",      partnersRoutes);            // clinics, stores, NGOs, helplines, ABC centres
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/conflicts",     conflictRoutes);
app.use("/api/v1/legal",         legalRoutes);
app.use("/api/v1/media",         mediaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
