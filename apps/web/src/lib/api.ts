export interface User {
  id: string;
  phone: string;
  fullName: string | null;
  role: "citizen" | "ngo" | "govt" | "admin" | "hospital";
  profilePhotoUrl: string | null;
  reputationScore: number;
  activeCaseLimit: number;
  isAvailable: boolean;
  vehicleType: string | null;
  serviceRadiusKm: number;
  homeLocation: { latitude: number; longitude: number } | null;
}

export interface Animal {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  color: string | null;
  gender: string | null;
  approxAgeMonths: number | null;
  status: "community" | "lost" | "found" | "adopted" | "reunited";
  isSterilized: boolean;
  location: { latitude: number; longitude: number };
  territoryLabel: string | null;
  lastSeenText: string | null;
  description: string | null;
  primaryPhotoUrl?: string | null;
  photoUrls?: string[];
  evidenceUrls?: string[];
  vaccinationStatus?: string | null;
  disappearanceRiskLevel?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AnimalMedicalRecord {
  id: string;
  animalId: string;
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
  reporterUserId: string | null;
  assignedToUserId: string | null;
  caseType: "rescue" | "lost_pet" | "abc" | "conflict" | "abuse" | "wildlife";
  status: "open" | "in_review" | "action_taken" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  title: string;
  description: string;
  locationText: string | null;
  evidenceUrls: string[];
  guestPhone?: string | null;
  createdAt: string;
  updatedAt: string;
  location?: { latitude: number; longitude: number } | null;
}

export interface CaseEvent {
  id: string;
  caseId: string;
  eventType: string;
  actorRole: string;
  actorUserId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CaseResponse {
  id: string;
  caseId: string;
  responderUserId: string;
  responderName: string | null;
  status: "en_route" | "on_scene" | "picked_up" | "at_hospital" | "completed" | "abandoned";
  notes: string | null;
  createdAt: string;
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
}

export interface FundingCase {
  id: string;
  caseId: string | null;
  fundingType: string;
  totalAmount: number;
  raisedAmount: number;
  status: string;
  hospitalName?: string | null;
  verifierName?: string | null;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  type: "clinic" | "store" | "ngo" | "helpline" | "abc_centre" | "wildlife_centre";
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  services: string[];
  is24hr?: boolean;
  acceptsStrays?: boolean;
  hasSurgery?: boolean;
  isVerified?: boolean;
  distanceKm?: number;
}

export interface WildlifeCenter {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  location: { latitude: number; longitude: number } | null;
  acceptedSpecies: string[];
  operatingHours: string | null;
  is24hr: boolean;
  city: string | null;
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
  createdAt: string;
}

export interface ConflictReport {
  id: string;
  reporterUserId: string;
  conflictType: string;
  description: string;
  location: { latitude: number; longitude: number };
  locationText: string | null;
  severity: string;
  status: string;
  createdAt: string;
}

export interface TransportRequest {
  id: string;
  caseId: string;
  animalId: string | null;
  requestedByUserId: string;
  assignedToUserId: string | null;
  vehicleTypeRequired: string;
  patientCondition: string;
  status: string;
  slabAmountInr: number;
  fundingSource: string;
  createdAt: string;
}

export interface EducationContent {
  id: string;
  topicKey: string;
  title: string;
  audience: string;
  summary: string;
  actionPoints: string[];
  triggerCaseType: string | null;
  triggerAnimalStatus: string | null;
  languageCode: string;
  createdAt: string;
}

export interface QrCode {
  id: string;
  code: string;
  qrType: string;
  linkedAnimalId: string | null;
  linkedZoneId: string | null;
  linkedCaseId: string | null;
  location: { latitude: number; longitude: number } | null;
  locationText: string | null;
  displayLabel: string | null;
  scanCount: number;
  lastScannedAt: string | null;
  isActive: boolean;
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

export interface AdoptableAnimal extends Animal {
  adoptableSince: string | null;
  adoptionNotes: string | null;
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
  requestedByUserId: string;
  createdAt: string;
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
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
    if (typeof window !== "undefined") {
      this.token = window.localStorage.getItem("fa_token");
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        window.localStorage.setItem("fa_token", token);
        document.cookie = `fa_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      } else {
        window.localStorage.removeItem("fa_token");
        document.cookie = "fa_token=; path=/; max-age=0; SameSite=Lax";
      }
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers = new Headers(options?.headers);
    if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Invalid API response format");
    }
    const p = payload as { success?: boolean; message?: string; data?: T };
    if (!response.ok || p.success === false) {
      throw new Error(p.message || `API error (${response.status})`);
    }
    return p.data as T;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async signup(email: string, password: string, fullName: string): Promise<{ email: string }> {
    return this.request<{ email: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  async updateProfilePhoto(profilePhotoUrl: string | null): Promise<User> {
    return this.request<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ profilePhotoUrl }),
    });
  }

  async requestOrgVerification(data: {
    orgName: string; orgType?: string; registrationNumber?: string;
    address?: string; documentUrls?: string[]; requestedTier?: number;
  }): Promise<void> {
    await this.request<void>("/auth/org-verification/request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ── Animals ───────────────────────────────────────────────────────────────
  async listAnimals(params?: {
    latitude?: number; longitude?: number; radiusKm?: number;
    limit?: number; queryText?: string; status?: string; species?: string;
  }): Promise<Animal[]> {
    const sp = new URLSearchParams();
    if (params?.latitude)  sp.append("latitude",  params.latitude.toString());
    if (params?.longitude) sp.append("longitude", params.longitude.toString());
    if (params?.radiusKm)  sp.append("radiusKm",  params.radiusKm.toString());
    if (params?.limit)     sp.append("limit",     params.limit.toString());
    if (params?.queryText) sp.append("queryText", params.queryText);
    if (params?.status)    sp.append("status",    params.status);
    if (params?.species)   sp.append("species",   params.species);
    const qs = sp.toString();
    return this.request<Animal[]>(`/animals${qs ? `?${qs}` : ""}`);
  }

  async createAnimal(data: {
    species: string; location: { latitude: number; longitude: number };
    status?: string; name?: string; breed?: string; color?: string;
    gender?: string; approxAgeMonths?: number; distinguishingMarks?: string;
    description?: string; territoryLabel?: string; primaryPhotoUrl?: string;
  }): Promise<Animal> {
    return this.request<Animal>("/animals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAnimal(id: string): Promise<Animal> {
    return this.request<Animal>(`/animals/${id}`);
  }

  async listAdoptableAnimals(species?: string): Promise<AdoptableAnimal[]> {
    const qs = species ? `?species=${encodeURIComponent(species)}` : "";
    return this.request<AdoptableAnimal[]>(`/adoption/animals${qs}`);
  }

  async getAnimalMedicalHistory(animalId: string): Promise<AnimalMedicalRecord[]> {
    return this.request<AnimalMedicalRecord[]>(`/animals/${animalId}/medical-history`).catch(() => []);
  }

  async getAnimalVaccinations(animalId: string): Promise<AnimalVaccination[]> {
    return this.request<AnimalVaccination[]>(`/animals/${animalId}/vaccinations`).catch(() => []);
  }

  async getAnimalCases(animalId: string): Promise<Case[]> {
    return this.request<Case[]>(`/cases?animalId=${animalId}&limit=20`).catch(() => []);
  }

  async getAnimalAbcEvents(animalId: string): Promise<AbcEvent[]> {
    return this.request<AbcEvent[]>(`/abc/tracking?animalId=${animalId}`).catch(() => []);
  }

  // ── Cases ─────────────────────────────────────────────────────────────────
  async createEmergencyCase(data: {
    severity: string; description: string; latitude: number; longitude: number;
    evidenceUrl?: string; guestEmail?: string; caseType?: string;
  }): Promise<Case> {
    return this.request<Case>("/cases/emergency", {
      method: "POST",
      body: JSON.stringify({
        caseType: data.caseType || "rescue",
        severity: data.severity,
        description: data.description,
        location: { latitude: data.latitude, longitude: data.longitude },
        evidenceUrls: data.evidenceUrl ? [data.evidenceUrl] : [],
        guestPhone: data.guestEmail,
      }),
    });
  }

  async createCase(data: {
    caseType: string; title: string; description: string;
    latitude: number; longitude: number;
    evidenceUrls?: string[]; priority?: string; animalId?: string;
  }): Promise<Case> {
    return this.request<Case>("/cases", {
      method: "POST",
      body: JSON.stringify({
        caseType: data.caseType,
        title: data.title,
        description: data.description,
        location: { latitude: data.latitude, longitude: data.longitude },
        evidenceUrls: data.evidenceUrls ?? [],
        priority: data.priority,
        animalId: data.animalId,
      }),
    });
  }

  async listCases(params?: { limit?: number; status?: string }): Promise<Case[]> {
    const sp = new URLSearchParams();
    if (params?.limit)  sp.append("limit",  params.limit.toString());
    if (params?.status) sp.append("status", params.status);
    const qs = sp.toString();
    return this.request<Case[]>(`/cases${qs ? `?${qs}` : ""}`);
  }

  async getCase(id: string): Promise<Case> {
    return this.request<Case>(`/cases/${id}`);
  }

  async getCaseEvents(id: string): Promise<CaseEvent[]> {
    return this.request<CaseEvent[]>(`/cases/${id}/events`);
  }

  async getCaseRecovery(caseId: string): Promise<RecoveryRecord[]> {
    return this.request<RecoveryRecord[]>(`/recovery/case/${caseId}`).catch(() => []);
  }

  async getTransportSlabs(): Promise<TransportSlab[]> {
    return this.request<TransportSlab[]>("/recovery/transport/slabs").catch(() => []);
  }

  // ── Emergency Response ────────────────────────────────────────────────────
  async claimCase(caseId: string): Promise<CaseResponse> {
    return this.request<CaseResponse>(`/emergency/${caseId}/claim`, { method: "POST" });
  }

  async updateResponderStatus(caseId: string, status: string, notes?: string): Promise<CaseResponse> {
    return this.request<CaseResponse>(`/emergency/${caseId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    });
  }

  async abandonClaim(caseId: string, reason: string): Promise<void> {
    await this.request<void>(`/emergency/${caseId}/abandon`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async getActiveResponse(caseId: string): Promise<CaseResponse> {
    return this.request<CaseResponse>(`/emergency/${caseId}/response`);
  }

  // ── Funding ───────────────────────────────────────────────────────────────
  async listFundingCases(): Promise<FundingCase[]> {
    return this.request<FundingCase[]>("/funding?limit=50").catch(() => []);
  }

  async getFunding(id: string): Promise<FundingCase> {
    return this.request<FundingCase>(`/funding/${id}`);
  }

  async donate(fundingCaseId: string, amount: number): Promise<void> {
    await this.request<void>("/funding/donate", {
      method: "POST",
      body: JSON.stringify({ fundingCaseId, amount }),
    });
  }

  // ── Adoption ──────────────────────────────────────────────────────────────
  async applyForAdoption(data: {
    animalId: string; fullName: string; phone: string; address: string;
    livingSituation: string; hasOtherPets: boolean; otherPetsDesc?: string;
    priorExperience: string; hoursAlonePerDay: number; reasonForAdopting: string;
  }): Promise<AdoptionApplication> {
    return this.request<AdoptionApplication>("/adoption/apply", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listMyAdoptionApplications(): Promise<AdoptionApplication[]> {
    return this.request<AdoptionApplication[]>("/adoption/applications").catch(() => []);
  }

  async confirmAdoption(applicationId: string): Promise<AdoptionApplication> {
    return this.request<AdoptionApplication>(`/adoption/applications/${applicationId}/confirm`, {
      method: "POST",
    });
  }

  // ── ABC ───────────────────────────────────────────────────────────────────
  async requestAbc(data: {
    animalId: string; notes?: string; locationText?: string;
    latitude: number; longitude: number;
  }): Promise<{ id: string }> {
    return this.request<{ id: string }>("/abc/requests", {
      method: "POST",
      body: JSON.stringify({
        animalId: data.animalId,
        notes: data.notes,
        locationText: data.locationText,
        location: { latitude: data.latitude, longitude: data.longitude },
      }),
    });
  }

  async listAbcEvents(animalId?: string): Promise<AbcEvent[]> {
    const qs = animalId ? `?animalId=${animalId}` : "";
    return this.request<AbcEvent[]>(`/abc/tracking${qs}`).catch(() => []);
  }

  // ── Partners ──────────────────────────────────────────────────────────────
  async listClinics(latitude?: number, longitude?: number, radiusKm?: number, emergencyOnly?: boolean, straysOnly?: boolean): Promise<Partner[]> {
    const sp = new URLSearchParams();
    if (latitude)      sp.append("latitude",     latitude.toString());
    if (longitude)     sp.append("longitude",    longitude.toString());
    if (radiusKm)      sp.append("radiusKm",     radiusKm.toString());
    if (emergencyOnly) sp.append("emergencyOnly","true");
    if (straysOnly)    sp.append("straysOnly",   "true");
    return this.request<Partner[]>(`/partners/clinics${sp.toString() ? `?${sp}` : ""}`);
  }

  async listStores(latitude?: number, longitude?: number, radiusKm?: number, medicalOnly?: boolean): Promise<Partner[]> {
    const sp = new URLSearchParams();
    if (latitude)   sp.append("latitude",   latitude.toString());
    if (longitude)  sp.append("longitude",  longitude.toString());
    if (radiusKm)   sp.append("radiusKm",   radiusKm.toString());
    if (medicalOnly) sp.append("medicalOnly","true");
    return this.request<Partner[]>(`/partners/stores${sp.toString() ? `?${sp}` : ""}`);
  }

  async listWelfareOrgs(verifiedOnly?: boolean, orgType?: string): Promise<Partner[]> {
    const sp = new URLSearchParams();
    if (verifiedOnly) sp.append("verifiedOnly","true");
    if (orgType)      sp.append("orgType",     orgType);
    return this.request<Partner[]>(`/partners/welfare-orgs${sp.toString() ? `?${sp}` : ""}`);
  }

  async listHelplines(): Promise<Partner[]> {
    return this.request<Partner[]>("/partners/helplines");
  }

  async listAbcCentres(): Promise<Partner[]> {
    return this.request<Partner[]>("/partners/abc-centres");
  }

  // ── Wildlife ──────────────────────────────────────────────────────────────
  async listWildlifeSpecies(): Promise<WildlifeSpecies[]> {
    return this.request<WildlifeSpecies[]>("/wildlife/species");
  }

  async getWildlifeGuidance(species: string): Promise<WildlifeSpecies> {
    return this.request<WildlifeSpecies>(`/wildlife/guidance/${species}`);
  }

  async listWildlifeCenters(latitude?: number, longitude?: number, species?: string): Promise<WildlifeCenter[]> {
    const sp = new URLSearchParams();
    if (latitude)  sp.append("latitude",  latitude.toString());
    if (longitude) sp.append("longitude", longitude.toString());
    if (species)   sp.append("species",   species);
    return this.request<WildlifeCenter[]>(`/wildlife/centers${sp.toString() ? `?${sp}` : ""}`);
  }

  async reportWildlife(data: {
    speciesCategory: string; condition: string; description: string;
    latitude: number; longitude: number; locationText?: string; photoUrls?: string[];
  }): Promise<{ caseRecord: { id: string }; guidance: { publicGuidance: string; doNotDo: string; displayName: string }; nearestCenters: WildlifeCenter[] }> {
    return this.request("/wildlife/report", {
      method: "POST",
      body: JSON.stringify({
        speciesCategory: data.speciesCategory,
        condition: data.condition,
        description: data.description,
        location: { latitude: data.latitude, longitude: data.longitude },
        locationText: data.locationText,
        photoUrls: data.photoUrls ?? [],
      }),
    });
  }

  // ── Safety ────────────────────────────────────────────────────────────────
  async listBehaviourGuidance(situationType?: string): Promise<BehaviourGuidanceCard[]> {
    const path = situationType ? `/safety/guidance/${situationType}` : "/safety/guidance";
    return this.request<BehaviourGuidanceCard[]>(path).catch(() => []);
  }

  async reportSafetyConcern(data: {
    situationType: string; description: string;
    latitude: number; longitude: number; locationText?: string;
    severity?: string; animalId?: string;
  }): Promise<{ report: SafetyReport; guidance: BehaviourGuidanceCard[]; humaneResponse: string }> {
    return this.request("/safety/report", {
      method: "POST",
      body: JSON.stringify({
        situationType: data.situationType,
        description: data.description,
        location: { latitude: data.latitude, longitude: data.longitude },
        locationText: data.locationText,
        severity: data.severity ?? "medium",
        animalId: data.animalId,
      }),
    });
  }

  async listConflictReports(status?: string): Promise<ConflictReport[]> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<ConflictReport[]>(`/conflict${qs}`).catch(() => []);
  }

  async reportConflict(data: {
    conflictType: string; description: string;
    latitude: number; longitude: number; locationText?: string; severity?: string;
  }): Promise<ConflictReport> {
    return this.request<ConflictReport>("/conflict", {
      method: "POST",
      body: JSON.stringify({
        conflictType: data.conflictType,
        description: data.description,
        location: { latitude: data.latitude, longitude: data.longitude },
        locationText: data.locationText,
        severity: data.severity ?? "medium",
      }),
    });
  }

  async listTransportRequests(caseId?: string, status?: string): Promise<TransportRequest[]> {
    const sp = new URLSearchParams();
    if (caseId) sp.append("caseId", caseId);
    if (status) sp.append("status", status);
    const qs = sp.toString();
    return this.request<TransportRequest[]>(`/transport-requests${qs ? `?${qs}` : ""}`).catch(() => []);
  }

  async createTransportRequest(data: {
    caseId: string; animalId?: string; vehicleTypeRequired: string; patientCondition: string;
    pickupLocation: { latitude: number; longitude: number }; pickupLocationText?: string;
    destinationLocation: { latitude: number; longitude: number }; destinationLocationText?: string;
    slabId?: string; slabAmountInr?: number; fundingSource?: string;
  }): Promise<TransportRequest> {
    return this.request<TransportRequest>("/transport-requests", {
      method: "POST",
      body: JSON.stringify({
        caseId: data.caseId,
        animalId: data.animalId,
        vehicleTypeRequired: data.vehicleTypeRequired,
        patientCondition: data.patientCondition,
        pickupLocation: data.pickupLocation,
        pickupLocationText: data.pickupLocationText,
        destinationLocation: data.destinationLocation,
        destinationLocationText: data.destinationLocationText,
        slabId: data.slabId,
        slabAmountInr: data.slabAmountInr,
        fundingSource: data.fundingSource,
      }),
    });
  }

  async listEducationContent(audience?: string, topicKey?: string): Promise<EducationContent[]> {
    const sp = new URLSearchParams();
    if (audience) sp.append("audience", audience);
    if (topicKey) sp.append("topicKey", topicKey);
    const qs = sp.toString();
    return this.request<EducationContent[]>(`/education${qs ? `?${qs}` : ""}`).catch(() => []);
  }

  async listQrCodes(): Promise<QrCode[]> {
    return this.request<QrCode[]>("/qr-codes").catch(() => []);
  }

  async createQrCode(data: {
    code: string; qrType: string; linkedAnimalId?: string; linkedZoneId?: string; linkedCaseId?: string;
    latitude?: number; longitude?: number; locationText?: string; displayLabel?: string;
  }): Promise<QrCode> {
    return this.request<QrCode>("/qr-codes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getQrCode(code: string): Promise<QrCode> {
    return this.request<QrCode>(`/qr-codes/${code}`);
  }

  async getWardSummaries(): Promise<WardSummary[]> {
    return this.request<WardSummary[]>("/safety/ward-summary").catch(() => []);
  }

  async getWardSummary(wardName: string): Promise<WardSummary[]> {
    return this.request<WardSummary[]>(`/safety/ward-summary?ward=${encodeURIComponent(wardName)}`).catch(() => []);
  }

  async getPublicOutcomes(wardName?: string): Promise<PublicOutcome[]> {
    const qs = wardName ? `?ward=${encodeURIComponent(wardName)}` : "";
    return this.request<PublicOutcome[]>(`/safety/outcomes${qs}`).catch(() => []);
  }

  async getResponseMetrics(): Promise<ResponseMetrics> {
    return this.request<ResponseMetrics>("/safety/metrics").catch(() => ({
      avgMinsToFirstClaim: null, avgMinsToPickup: null, avgMinsToClinic: null,
      totalCasesTracked: 0, casesRespondedWithin15Mins: 0,
    }));
  }

  // ── CSR ───────────────────────────────────────────────────────────────────
  async getCsrImpactReport(): Promise<CsrImpactReport> {
    return this.request<CsrImpactReport>("/csr/impact").catch(() => ({
      totalCommittedInr: 0, totalDisbursedInr: 0,
      activeSponsorCount: 0, wardsCovered: 0, casesSupported: 0, sponsors: [],
    }));
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async listNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/notifications");
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request<void>(`/notifications/${id}/read`, { method: "PATCH" });
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  async updateVolunteerProfile(settings: {
    fullName?: string | null; isAvailable?: boolean; activeCaseLimit?: number;
    vehicleType?: string | null; serviceRadiusKm?: number;
    homeLocation?: { latitude: number; longitude: number } | null;
  }): Promise<User> {
    return this.request<User>("/users/me/volunteer", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }

  // ── Media ─────────────────────────────────────────────────────────────────
  async uploadMedia(file: File, purpose: string, linkedCaseId?: string, linkedAnimalId?: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("originalName", file.name);
    fd.append("mimeType", file.type);
    fd.append("sizeBytes", String(file.size));
    fd.append("purpose", purpose);
    if (linkedCaseId) fd.append("linkedCaseId", linkedCaseId);
    if (linkedAnimalId) fd.append("linkedAnimalId", linkedAnimalId);

    const res = await fetch(`${this.baseUrl}/media/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const data = await res.json();
    return data.data as { uploadUrl: string; publicUrl: string };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async listVerifications(): Promise<{ ngo: any[]; identity: any[] }> {
    const [ngo, identity] = await Promise.all([
      this.request<any[]>("/admin/verifications/ngo").catch(() => []),
      this.request<any[]>("/admin/verifications/identity").catch(() => []),
    ]);
    return { ngo: ngo ?? [], identity: identity ?? [] };
  }

  async approveVerification(type: "ngo" | "identity", verificationId: string, approved: boolean, notes?: string, requestedTier?: number): Promise<any> {
    const body: Record<string, unknown> = { verificationId, approved, notes };
    if (type === "ngo" && requestedTier !== undefined) body.requestedTier = requestedTier;
    return this.request<any>(`/admin/verifications/${type}/approve`, { method: "POST", body: JSON.stringify(body) });
  }

  async listReimbursementRequests(): Promise<any[]> {
    return this.request<any[]>("/admin/reimbursements").catch(() => []);
  }

  async releasePayout(fundingCaseId: string): Promise<any> {
    return this.request<any>(`/admin/funding/${fundingCaseId}/release-payout`, { method: "POST", body: JSON.stringify({ fundingCaseId }) });
  }

  async listAdminCases(filters?: { status?: string; caseType?: string; ward?: string }): Promise<any[]> {
    const sp = new URLSearchParams();
    if (filters?.status) sp.append("status", filters.status);
    if (filters?.caseType) sp.append("caseType", filters.caseType);
    if (filters?.ward) sp.append("ward", filters.ward);
    const qs = sp.toString();
    return this.request<any[]>(`/admin/cases${qs ? `?${qs}` : ""}`).catch(() => []);
  }

  async updateAdminCaseStatus(caseId: string, status: string): Promise<any> {
    return this.request<any>(`/admin/cases/${caseId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  }

  async listAdminUsers(limit = 100): Promise<any[]> {
    return this.request<any[]>(`/admin/users?limit=${limit}`).catch(() => []);
  }

  async updateAdminUser(userId: string, data: { isBanned?: boolean; role?: string; identityTier?: number }): Promise<any> {
    return this.request<any>(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }
}

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_BASE_URL);
