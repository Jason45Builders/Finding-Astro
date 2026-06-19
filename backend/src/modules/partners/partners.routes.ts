/**
 * partners.routes.ts
 * PLACE AT: backend/src/modules/partners/partners.routes.ts
 * Register in app.ts: app.use("/api/v1/partners", partnersRoutes);
 */

import { Router } from "express";
import { z } from "zod";
import { validateQuery } from "../../middleware/validation.middleware";
import { asyncHandler, sendSuccess } from "../../utils/response";
import { partnersService } from "./partners.service";

const router = Router();

const locationQuery = z.object({
  latitude:     z.coerce.number().min(-90).max(90).optional(),
  longitude:    z.coerce.number().min(-180).max(180).optional(),
  radiusKm:     z.coerce.number().positive().max(50).optional(),
  emergencyOnly: z.coerce.boolean().optional(),
  straysOnly:   z.coerce.boolean().optional(),
  medicalOnly:  z.coerce.boolean().optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  orgType:      z.string().optional(),
});

// Clinic picker — used during emergency case (responder selects clinic)
// Sorted: 24hr stray-accepting first, then by distance
router.get("/clinics", validateQuery(locationQuery), asyncHandler(async (req, res) => {
  const { latitude, longitude, radiusKm, emergencyOnly, straysOnly } = req.query as any;
  const location = latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : { latitude: 13.0827, longitude: 80.2707 }; // Chennai default
  const clinics = await partnersService.getClinicsNearby(location, radiusKm, { emergencyOnly, straysOnly });
  sendSuccess(res, clinics, `${clinics.length} clinics found`);
}));

// Emergency clinics only (24hr + stray-accepting) — fast call for emergency flow
router.get("/clinics/emergency", asyncHandler(async (req, res) => {
  const { lat, lng } = req.query as { lat?: string; lng?: string };
  const location = lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : { latitude: 13.0827, longitude: 80.2707 };
  const clinics = await partnersService.getClinicsNearby(location, 20, { emergencyOnly: true, straysOnly: true });
  sendSuccess(res, clinics, `${clinics.length} emergency clinics found`);
}));

// Pet stores — shown to responder en route for supplements
router.get("/stores", validateQuery(locationQuery), asyncHandler(async (req, res) => {
  const { latitude, longitude, radiusKm, medicalOnly } = req.query as any;
  const location = latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : { latitude: 13.0827, longitude: 80.2707 };
  const stores = await partnersService.getStoresNearby(location, radiusKm ?? 5, medicalOnly);
  sendSuccess(res, stores, `${stores.length} stores found`);
}));

// ABC centres — for Civic Hub ABC tracking
router.get("/abc-centres", validateQuery(locationQuery), asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.query as any;
  const location = latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined;
  const centres = await partnersService.getAbcCentres(location);
  sendSuccess(res, centres, `${centres.length} ABC centres`);
}));

// Welfare organisations — NGOs, boards, SPCAs
router.get("/welfare-orgs", validateQuery(locationQuery), asyncHandler(async (req, res) => {
  const { verifiedOnly, orgType } = req.query as any;
  const orgs = await partnersService.getWelfareOrgs({ verifiedOnly, orgType });
  sendSuccess(res, orgs, `${orgs.length} organisations`);
}));

// Emergency helplines — Legal Hub, Safety screen
router.get("/helplines", asyncHandler(async (_req, res) => {
  const helplines = await partnersService.getHelplines();
  sendSuccess(res, helplines, `${helplines.length} helplines`);
}));

export default router;
