export type Profile = User;
export type CaseRecord = Case;

export interface User {
  id: string;
  email?: string;
  fullName: string | null;
  role: "citizen" | "ngo" | "govt" | "admin" | "hospital";
  reputationScore: number;
  reportCredibilityScore: number;
  isBanned: boolean;
  activeCaseLimit: number;
  isAvailable: boolean;
  vehicleType: string | null;
  vehicleCapacity: number | null;
  serviceRadiusKm: number;
  homeLocation: { latitude: number; longitude: number } | null;
  lastActiveLocation: { latitude: number; longitude: number } | null;
  pushToken: string | null;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface Animal {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  color: string | null;
  gender: string | null;
  approxAgeMonths: number | null;
  size: string | null;
  temperament: string | null;
  distinguishingMarks: string | null;
  description: string | null;
  status: "community" | "lost" | "found" | "reunited" | "adopted";
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  isSterilized: boolean;
  lastSeenText: string | null;
  location: { latitude: number; longitude: number };
  territoryLabel: string | null;
  visualSignature: unknown;
  lastSeenAt: string | null;
  lastConfirmedAliveAt: string | null;
  seenTodayCount: number;
  disappearanceRiskLevel: string;
  vaccinationStatus: string | null;
  caretakerUserId: string | null;
  createdByUserId: string | null;
  adoptableSince: string | null;
  adoptionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnimalMedicalRecord {
  id: string;
  animalId: string;
  caseId: string | null;
  abcEventId: string | null;
  createdByUserId: string | null;
  entryType: "treatment" | "vaccination" | "surgery" | "observation";
  title: string;
  notes: string | null;
  providerName: string | null;
  treatmentDate: string;
  costAmount: number | null;
  attachments: string[];
  createdAt: string;
}

export interface AnimalVaccination {
  id: string;
  animalId: string;
  vaccineName: string;
  administeredAt: string;
  expiresAt: string | null;
  batchNumber: string | null;
  notes: string | null;
  verified: boolean;
  status: "verified" | "unverified" | "expired";
  createdAt: string;
}

export interface Case {
  id: string;
  animalId: string | null;
  reporterUserId: string;
  assignedToUserId: string | null;
  caseType: "rescue" | "lost_pet" | "abc" | "conflict" | "abuse" | "wildlife";
  status: "open" | "in_review" | "action_taken" | "resolved" | "closed" | "VERIFIED_REIMBURSEMENT";
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  locationText: string | null;
  evidenceUrls: string[];
  resolutionNotes: string | null;
  assignmentScore: number | null;
  assignmentReason: string | null;
  wildlifeSpeciesCategory: string | null;
  wildlifeCondition: string | null;
  publicGuidanceShown: boolean;
  guestPhone: string | null;
  heldForReview: boolean;
  ngoVerified: boolean;
  ngoVerifiedBy: string | null;
  ngoVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  location: { latitude: number; longitude: number };
}

export interface CaseEvent {
  id: string;
  caseId: string;
  actorId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CaseResponse {
  id: string;
  caseId: string;
  responderUserId: string;
  status: "claimed" | "en_route" | "on_scene" | "picked_up" | "at_hospital" | "completed" | "abandoned";
  claimedAt: string;
  deadlineAt: string;
  reachedAt: string | null;
  pickedUpAt: string | null;
  atHospitalAt: string | null;
  completedAt: string | null;
  abandonedAt: string | null;
  abandonReason: string | null;
  hospitalId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryRecord {
  id: string;
  caseId: string;
  animalId: string | null;
  providerName: string | null;
  providerType: "foster" | "ngo_shelter" | "clinic";
  dailyCostInr: number;
  startDate: string;
  endDate: string | null;
  totalRaised: number;
  status: string;
  createdAt: string;
}

export interface TransportSlab {
  id: string;
  label: string;
  amountInr: number;
  maxDistKm: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface FundingCase {
  id: string;
  caseId: string | null;
  fundingType: string;
  totalAmount: number;
  amountRaised: number;
  status: string;
  hospitalName?: string | null;
  verifierName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  name: string;
  type: "clinic" | "store" | "ngo" | "helpline" | "abc_centre" | "wildlife_centre" | "welfare_org";
  phone: string | null;
  email: string | null;
  address: string | null;
  wardName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  services: string[];
  is24hr: boolean;
  acceptsStrays: boolean;
  hasSurgery: boolean;
  hasInpatient: boolean;
  clinicType: string;
  operatingHours: string | null;
  isVerified: boolean;
  isActive: boolean;
  acceptedSpecies: string[];
  googlePlaceId: string | null;
  distanceKm?: number;
}

export interface WildlifeCenter {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  city: string | null;
  location: { latitude: number; longitude: number } | null;
  acceptedSpecies: string[];
  operatingHours: string | null;
  is24hr: boolean;
  isActive: boolean;
  distanceKm?: number;
}

export interface WildlifeSpecies {
  id: string;
  name: string;
  displayName: string;
  handlingRisk: string;
  publicGuidance: string;
  doNotDo: string;
  isActive: boolean;
}

export interface BehaviourGuidanceCard {
  id: string;
  situationType: string;
  title: string;
  content: string;
  doItems: string[];
  dontItems: string[];
  audience: string;
}

export interface SafetyReport {
  id: string;
  reporterUserId: string;
  situationType: string;
  description: string;
  location: { latitude: number; longitude: number };
  locationText: string | null;
  severity: string;
  animalId: string | null;
  guidanceShown: string[];
  referredToCaseId: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface PublicOutcome {
  id: string;
  caseId: string | null;
  animalId: string | null;
  outcomeType: string;
  headline: string;
  detail: string | null;
  locationText: string | null;
  wardName: string | null;
  isPublic: boolean;
  occurredAt: string;
}

export interface WardSummary {
  wardName: string;
  totalAnimals: number;
  sterilisedCount: number;
  vaccinatedCount: number;
  lostCount: number;
  openCases: number;
  resolvedCases30d: number;
  abcCoveragePct: number;
  lastActivityAt: string | null;
}

export interface AdoptionApplication {
  id: string;
  animalId: string;
  applicantUserId: string;
  fullName: string;
  phone: string;
  address: string;
  livingSituation: string;
  hasOtherPets: boolean;
  otherPetsDesc: string | null;
  priorExperience: string;
  hoursAlonePerDay: number;
  reasonForAdopting: string;
  status: "pending_review" | "approved" | "trial" | "adopted" | "rejected" | "returned";
  rejectionReason: string | null;
  reviewNotes: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  agreementAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdoptableAnimal extends Animal {
  adoptableSince: string | null;
  adoptionNotes: string | null;
}

export interface CsrImpactReport {
  totalCommittedInr: number;
  totalDisbursedInr: number;
  activeSponsorCount: number;
  wardsCovered: number;
  casesSupported: number;
  sponsors: Array<{
    id: string;
    orgName: string;
    commitmentType: string;
    committedAmountInr: number;
    disbursedAmountInr: number;
    isActive: boolean;
  }>;
}

export interface AbcEvent {
  id: string;
  animalId: string;
  animalName: string | null;
  caseId: string | null;
  eventType: "request" | "capture" | "surgery" | "return";
  status: string;
  notes: string | null;
  location: { latitude: number; longitude: number } | null;
  geoValidated: boolean;
  unreturnedAlert: boolean;
  requestedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseMetrics {
  avgMinsToFirstClaim: number | null;
  avgMinsToPickup: number | null;
  avgMinsToClinic: number | null;
  totalCasesTracked: number;
  casesRespondedWithin15Mins: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: (row.email as string | null) ?? undefined,
    fullName: row.full_name as string | null,
    role: row.role as User["role"],
    reputationScore: (row.reputation_score as number) ?? 50,
    reportCredibilityScore: (row.report_credibility_score as number) ?? 100,
    isBanned: (row.is_banned as boolean) ?? false,
    activeCaseLimit: (row.active_case_limit as number) ?? 3,
    isAvailable: (row.is_available as boolean) ?? false,
    vehicleType: row.vehicle_type as string | null,
    vehicleCapacity: row.vehicle_capacity as number | null,
    serviceRadiusKm: (row.service_radius_km as number) ?? 10,
    homeLocation: row.home_location as { latitude: number; longitude: number } | null,
    lastActiveLocation: row.last_active_location as { latitude: number; longitude: number } | null,
    pushToken: row.push_token as string | null,
    lastLoginAt: row.last_login_at as string | null,
    lastActiveAt: row.last_active_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapAnimal(row: Record<string, unknown>): Animal {
  return {
    id: row.id as string,
    name: row.name as string | null,
    species: row.species as string,
    breed: row.breed as string | null,
    color: row.color as string | null,
    gender: row.gender as string | null,
    approxAgeMonths: row.approx_age_months as number | null,
    size: row.size as string | null,
    temperament: row.temperament as string | null,
    distinguishingMarks: row.distinguishing_marks as string | null,
    description: row.description as string | null,
    status: row.status as Animal["status"],
    primaryPhotoUrl: row.primary_photo_url as string | null,
    photoUrls: (row.photo_urls as string[]) ?? [],
    isSterilized: (row.is_sterilized as boolean) ?? false,
    lastSeenText: row.last_seen_text as string | null,
    location: (row.location as { latitude: number; longitude: number }) ?? { latitude: 0, longitude: 0 },
    territoryLabel: row.territory_label as string | null,
    visualSignature: row.visual_signature,
    lastSeenAt: row.last_seen_at as string | null,
    lastConfirmedAliveAt: row.last_confirmed_alive_at as string | null,
    seenTodayCount: (row.seen_today_count as number) ?? 0,
    disappearanceRiskLevel: (row.disappearance_risk_level as string) ?? "stable",
    vaccinationStatus: row.vaccination_status as string | null,
    caretakerUserId: row.caretaker_user_id as string | null,
    createdByUserId: row.created_by_user_id as string | null,
    adoptableSince: row.adoptable_since as string | null,
    adoptionNotes: row.adoption_notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCase(row: Record<string, unknown>): Case {
  return {
    id: row.id as string,
    animalId: row.animal_id as string | null,
    reporterUserId: row.reporter_user_id as string,
    assignedToUserId: row.assigned_to_user_id as string | null,
    caseType: row.case_type as Case["caseType"],
    status: row.status as Case["status"],
    priority: (row.priority as Case["priority"]) ?? "medium",
    title: row.title as string,
    description: row.description as string,
    locationText: row.location_text as string | null,
    evidenceUrls: (row.evidence_urls as string[]) ?? [],
    resolutionNotes: row.resolution_notes as string | null,
    assignmentScore: row.assignment_score as number | null,
    assignmentReason: row.assignment_reason as string | null,
    wildlifeSpeciesCategory: row.wildlife_species_category as string | null,
    wildlifeCondition: row.wildlife_condition as string | null,
    publicGuidanceShown: (row.public_guidance_shown as boolean) ?? false,
    guestPhone: row.guest_phone as string | null,
    heldForReview: (row.held_for_review as boolean) ?? false,
    ngoVerified: (row.ngo_verified as boolean) ?? false,
    ngoVerifiedBy: row.ngo_verified_by as string | null,
    ngoVerifiedAt: row.ngo_verified_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    location: (row.location as { latitude: number; longitude: number }) ?? { latitude: 0, longitude: 0 },
  };
}

function mapPartner(row: Record<string, unknown>, type: string): Partner {
  const base: Partner = {
    id: row.id as string,
    name: row.name as string,
    type: type as Partner["type"],
    phone: row.phone as string | null,
    email: row.email as string | null,
    address: row.address as string | null,
    wardName: row.ward_name as string | null,
    city: row.city as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    services: [],
    is24hr: false,
    acceptsStrays: false,
    hasSurgery: false,
    hasInpatient: false,
    clinicType: "clinic",
    operatingHours: null,
    isVerified: false,
    isActive: true,
    acceptedSpecies: [],
    googlePlaceId: null,
  };
  if (type === "clinic") {
    base.services = [
      ...(row.accepts_strays ? ["strays"] : []),
      ...(row.emergency_24hr ? ["24hr"] : []),
      ...(row.has_surgery ? ["surgery"] : []),
      ...(row.has_inpatient ? ["inpatient"] : []),
    ];
    base.is24hr = (row.emergency_24hr as boolean) ?? false;
    base.acceptsStrays = (row.accepts_strays as boolean) ?? false;
    base.hasSurgery = (row.has_surgery as boolean) ?? false;
    base.hasInpatient = (row.has_inpatient as boolean) ?? false;
    base.clinicType = (row.clinic_type as string) ?? "clinic";
    base.operatingHours = row.operating_hours as string | null;
    base.isVerified = (row.is_verified as boolean) ?? false;
    base.isActive = (row.is_active as boolean) ?? true;
    base.googlePlaceId = row.google_place_id as string | null;
  }
  if (type === "store") {
    base.services = [
      ...(row.sells_medicine ? ["medicine"] : []),
      ...(row.sells_food ? ["food"] : []),
    ];
    base.isVerified = (row.is_verified as boolean) ?? false;
    base.isActive = (row.is_active as boolean) ?? true;
    base.googlePlaceId = row.google_place_id as string | null;
  }
  if (type === "abc_centre") {
    base.isVerified = (row.is_verified as boolean) ?? false;
    base.isActive = (row.is_active as boolean) ?? true;
  }
  if (type === "wildlife_centre") {
    base.acceptedSpecies = (row.accepted_species as string[]) ?? [];
    base.is24hr = (row.is_24hr as boolean) ?? false;
    base.isActive = (row.is_active as boolean) ?? true;
    base.operatingHours = row.operating_hours as string | null;
  }
  if (type === "helpline") {
    base.is24hr = (row.is_24hr as boolean) ?? false;
    base.isActive = (row.is_active as boolean) ?? true;
  }
  if (type === "welfare_org") {
    base.isVerified = (row.is_verified as boolean) ?? false;
    base.isActive = (row.is_active as boolean) ?? true;
    base.googlePlaceId = row.google_place_id as string | null;
  }
  return base;
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    title: row.title as string,
    message: row.message as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    readAt: row.read_at as string | null,
    createdAt: row.created_at as string,
  };
}

function mapWardSummary(row: Record<string, unknown>): WardSummary {
  return {
    wardName: row.ward_name as string,
    totalAnimals: (row.total_animals as number) ?? 0,
    sterilisedCount: (row.sterilised_count as number) ?? 0,
    vaccinatedCount: (row.vaccinated_count as number) ?? 0,
    lostCount: (row.lost_count as number) ?? 0,
    openCases: (row.open_cases as number) ?? 0,
    resolvedCases30d: (row.resolved_cases_30d as number) ?? 0,
    abcCoveragePct: (row.abc_coverage_pct as number) ?? 0,
    lastActivityAt: row.last_activity_at as string | null,
  };
}
