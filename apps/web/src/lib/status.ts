import type { BadgeVariant } from "@/components/ui/Badge";

export type StatusToken = { label: string; variant: BadgeVariant };

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CASE_STATUS: Record<string, StatusToken> = {
  open: { label: "Open", variant: "info" },
  in_review: { label: "In Review", variant: "warning" },
  action_taken: { label: "Action Taken", variant: "primary" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
};

const CASE_PRIORITY: Record<string, StatusToken> = {
  low: { label: "Low", variant: "neutral" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "danger" },
};

const CASE_TYPE: Record<string, StatusToken> = {
  rescue: { label: "Rescue", variant: "primary" },
  lost_pet: { label: "Lost Pet", variant: "info" },
  abc: { label: "ABC", variant: "success" },
  conflict: { label: "Conflict", variant: "warning" },
  abuse: { label: "Abuse", variant: "danger" },
  wildlife: { label: "Wildlife", variant: "primary" },
};

const ANIMAL_STATUS: Record<string, StatusToken> = {
  community: { label: "Community", variant: "success" },
  lost: { label: "Lost", variant: "danger" },
  found: { label: "Found", variant: "info" },
  adopted: { label: "Adopted", variant: "primary" },
  reunited: { label: "Reunited", variant: "success" },
};

const RESPONDER_STATUS: Record<string, StatusToken> = {
  en_route: { label: "En Route", variant: "info" },
  on_scene: { label: "On Scene", variant: "warning" },
  picked_up: { label: "Picked Up", variant: "primary" },
  at_hospital: { label: "At Hospital", variant: "primary" },
  completed: { label: "Completed", variant: "success" },
  abandoned: { label: "Abandoned", variant: "danger" },
};

const FUNDING_STATUS: Record<string, StatusToken> = {
  OPEN: { label: "Open", variant: "info" },
  PARTIALLY_FUNDED: { label: "Partially Funded", variant: "warning" },
  FULLY_FUNDED: { label: "Fully Funded", variant: "success" },
  CLOSED: { label: "Closed", variant: "neutral" },
  PAID_OUT: { label: "Paid Out", variant: "primary" },
};

const ADOPTION_STATUS: Record<string, StatusToken> = {
  pending_review: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "info" },
  trial: { label: "Trial", variant: "primary" },
  adopted: { label: "Adopted", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  returned: { label: "Returned", variant: "neutral" },
};

const PARTNER_TYPE: Record<string, StatusToken> = {
  clinic: { label: "Clinic", variant: "info" },
  store: { label: "Store", variant: "warning" },
  ngo: { label: "NGO", variant: "success" },
  helpline: { label: "Helpline", variant: "danger" },
  abc_centre: { label: "ABC Centre", variant: "primary" },
  wildlife_centre: { label: "Wildlife Centre", variant: "primary" },
};

const VACCINATION_STATUS: Record<string, StatusToken> = {
  verified: { label: "Verified", variant: "success" },
  unverified: { label: "Unverified", variant: "warning" },
  expired: { label: "Expired", variant: "danger" },
};

function lookup(map: Record<string, StatusToken>, value: string | null | undefined): StatusToken {
  if (!value) return { label: "Unknown", variant: "neutral" };
  return map[value] ?? { label: humanize(value), variant: "neutral" };
}

export const statusToken = {
  caseStatus: (v: string | null | undefined) => lookup(CASE_STATUS, v),
  casePriority: (v: string | null | undefined) => lookup(CASE_PRIORITY, v),
  caseType: (v: string | null | undefined) => lookup(CASE_TYPE, v),
  animalStatus: (v: string | null | undefined) => lookup(ANIMAL_STATUS, v),
  responderStatus: (v: string | null | undefined) => lookup(RESPONDER_STATUS, v),
  fundingStatus: (v: string | null | undefined) => lookup(FUNDING_STATUS, v),
  adoptionStatus: (v: string | null | undefined) => lookup(ADOPTION_STATUS, v),
  partnerType: (v: string | null | undefined) => lookup(PARTNER_TYPE, v),
  vaccinationStatus: (v: string | null | undefined) => lookup(VACCINATION_STATUS, v),
};
