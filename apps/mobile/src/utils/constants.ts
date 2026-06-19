import Constants from "expo-constants";

// API base URL — set EXPO_PUBLIC_API_URL in your EAS build profile for production
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

// Storage keys
export const SESSION_STORAGE_KEY       = "@finding_astro/session";
export const ONBOARDING_COMPLETE_KEY   = "@finding_astro/onboarding_done";
export const LOCATION_PERMISSION_KEY   = "@finding_astro/location_granted";

// Map defaults — Chennai, Tamil Nadu
export const DEFAULT_MAP_REGION = {
  latitude:       13.0827,
  longitude:      80.2707,
  latitudeDelta:  0.05,
  longitudeDelta: 0.05,
};

export const DEFAULT_SEARCH_RADIUS_KM = 5;
export const MAX_SEARCH_RADIUS_KM     = 50;

// Upload limits
export const MAX_UPLOAD_SIZE_MB        = 10;
export const MAX_PHOTOS_PER_CASE       = 5;
export const MAX_PHOTOS_PER_ANIMAL     = 8;

// Timing
export const OTP_RESEND_COOLDOWN_SECONDS    = 60;
export const LOCATION_REFRESH_INTERVAL_MS  = 5 * 60 * 1000;

// Case type display
export const caseTypes = ["rescue", "abuse", "conflict", "lost_pet", "abc"] as const;

export const CASE_TYPE_LABELS: Record<string, string> = {
  rescue:   "Rescue",
  abuse:    "Abuse",
  conflict: "Conflict",
  lost_pet: "Lost Pet",
  abc:      "ABC Programme",
};

export const CASE_TYPE_ICONS: Record<string, string> = {
  rescue:   "🚨",
  abuse:    "⚠️",
  conflict: "🤝",
  lost_pet: "🔍",
  abc:      "💉",
};

// Animal statuses
export const ANIMAL_STATUS_LABELS: Record<string, string> = {
  community: "Community",
  lost:      "Lost",
  found:     "Found",
  reunited:  "Reunited",
  adopted:   "Adopted",
};

// Reputation score thresholds
export const REPUTATION_LEVELS = [
  { min: 80, label: "Trusted", color: "#1E7B68" },
  { min: 60, label: "Active",  color: "#2B5FA0" },
  { min: 40, label: "Member",  color: "#C47B18" },
  { min: 0,  label: "New",     color: "#8A837A" },
];

export const getReputationLevel = (score: number) =>
  REPUTATION_LEVELS.find((l) => score >= l.min) ?? REPUTATION_LEVELS[REPUTATION_LEVELS.length - 1];
