/**
 * integrations/index.ts
 *
 * Factory / registry for all third-party integration adapters.
 * Reads environment variables and returns the correct adapter instances.
 * All adapters are lazily instantiated and cached.
 */

import { env } from "../config/env";

import { PaymentAdapter } from "./payment/PaymentAdapter";
import { MockPaymentAdapter } from "./payment/MockPaymentAdapter";
import { RazorpayAdapter } from "./payment/RazorpayAdapter";
import { StripeAdapter } from "./payment/StripeAdapter";

import { SmsAdapter } from "./sms/SmsAdapter";
import { MockSmsAdapter } from "./sms/MockSmsAdapter";
import { ExotelAdapter } from "./sms/ExotelAdapter";
import { Fast2SmsAdapter } from "./sms/Fast2SmsAdapter";

import { AadhaarAdapter } from "./aadhaar/AadhaarAdapter";
import { MockAadhaarAdapter } from "./aadhaar/MockAadhaarAdapter";
import { DigilockerAdapter } from "./aadhaar/DigilockerAdapter";

import { MapsAdapter } from "./maps/MapsAdapter";
import { MockMapsAdapter } from "./maps/MockMapsAdapter";
import { GoogleMapsAdapter } from "./maps/GoogleMapsAdapter";
import { MapboxAdapter } from "./maps/MapboxAdapter";

// ── Payment ───────────────────────────────────────────────────────────────────

let cachedPaymentAdapter: PaymentAdapter | null = null;

export function getPaymentAdapter(): PaymentAdapter {
  if (cachedPaymentAdapter) return cachedPaymentAdapter;

  const provider = env.PAYMENT_PROVIDER;
  switch (provider) {
    case "razorpay":
      cachedPaymentAdapter = new RazorpayAdapter();
      break;
    case "stripe":
      cachedPaymentAdapter = new StripeAdapter();
      break;
    case "mock":
      cachedPaymentAdapter = new MockPaymentAdapter();
      break;
    default:
      // Exhaustiveness check — should never happen because env is validated via Zod
      throw new Error(`Unknown payment provider: ${provider}`);
  }

  console.log(`[Integrations] Payment adapter loaded: ${provider}`);
  return cachedPaymentAdapter;
}

// ── SMS ─────────────────────────────────────────────────────────────────────

let cachedSmsAdapter: SmsAdapter | null = null;

export function getSmsAdapter(): SmsAdapter {
  if (cachedSmsAdapter) return cachedSmsAdapter;

  const provider = env.SMS_PROVIDER;
  switch (provider) {
    case "exotel":
      cachedSmsAdapter = new ExotelAdapter();
      break;
    case "fast2sms":
      cachedSmsAdapter = new Fast2SmsAdapter();
      break;
    case "mock":
      cachedSmsAdapter = new MockSmsAdapter();
      break;
    case "none":
      // Fallback to mock when none is selected so the app doesn't crash in dev
      cachedSmsAdapter = new MockSmsAdapter();
      break;
    default:
      throw new Error(`Unknown SMS provider: ${provider}`);
  }

  console.log(`[Integrations] SMS adapter loaded: ${provider}`);
  return cachedSmsAdapter;
}

// ── Aadhaar ─────────────────────────────────────────────────────────────────

let cachedAadhaarAdapter: AadhaarAdapter | null = null;

export function getAadhaarAdapter(): AadhaarAdapter {
  if (cachedAadhaarAdapter) return cachedAadhaarAdapter;

  const provider = env.AADHAAR_PROVIDER;
  switch (provider) {
    case "digilocker":
      cachedAadhaarAdapter = new DigilockerAdapter();
      break;
    case "mock":
      cachedAadhaarAdapter = new MockAadhaarAdapter();
      break;
    default:
      throw new Error(`Unknown Aadhaar provider: ${provider}`);
  }

  console.log(`[Integrations] Aadhaar adapter loaded: ${provider}`);
  return cachedAadhaarAdapter;
}

// ── Maps ────────────────────────────────────────────────────────────────────

let cachedMapsAdapter: MapsAdapter | null = null;

export function getMapsAdapter(): MapsAdapter {
  if (cachedMapsAdapter) return cachedMapsAdapter;

  const provider = env.MAPS_PROVIDER;
  switch (provider) {
    case "google":
      cachedMapsAdapter = new GoogleMapsAdapter();
      break;
    case "mapbox":
      cachedMapsAdapter = new MapboxAdapter();
      break;
    case "mock":
      cachedMapsAdapter = new MockMapsAdapter();
      break;
    default:
      throw new Error(`Unknown maps provider: ${provider}`);
  }

  console.log(`[Integrations] Maps adapter loaded: ${provider}`);
  return cachedMapsAdapter;
}

// ── Convenience re-exports for direct imports ───────────────────────────────

export type { PaymentAdapter, PaymentOrder, PaymentWebhookPayload, PaymentWebhookVerification } from "./payment/PaymentAdapter";
export type { SmsAdapter, SmsDeliveryResult } from "./sms/SmsAdapter";
export type { AadhaarAdapter, AadhaarVerificationInitiated, AadhaarVerificationResult } from "./aadhaar/AadhaarAdapter";
export type {
  MapsAdapter,
  GeoLocation,
  GeocodeResult,
  ReverseGeocodeResult,
  DirectionsResult,
  DirectionsStep,
  NearbyPlacesResult,
  NearbyPlace,
} from "./maps/MapsAdapter";

export {
  MockPaymentAdapter,
  RazorpayAdapter,
  StripeAdapter,
} from "./payment";

export {
  MockSmsAdapter,
  ExotelAdapter,
  Fast2SmsAdapter,
} from "./sms";

export {
  MockAadhaarAdapter,
  DigilockerAdapter,
} from "./aadhaar";

export {
  MockMapsAdapter,
  GoogleMapsAdapter,
  MapboxAdapter,
} from "./maps";
