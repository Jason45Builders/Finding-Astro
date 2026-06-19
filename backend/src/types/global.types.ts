import { Request } from "express";

export type UserRole = "citizen" | "ngo" | "govt" | "admin" | "hospital";
export type AnimalStatus = "community" | "lost" | "found" | "reunited" | "adopted";
export type CaseType = "rescue" | "abuse" | "conflict" | "lost_pet" | "abc";
export type CaseStatus = "open" | "in_review" | "action_taken" | "resolved" | "closed" | "VERIFIED_REIMBURSEMENT";
export type AbcEventType = "request" | "capture" | "surgery" | "return";
export type NotificationType = "auth" | "animal" | "case" | "abc" | "conflict" | "funding" | "medical" | "transport" | "education" | "system" | "adoption";
export type FundingType = "PRE_FUNDED" | "REIMBURSEMENT" | "TRANSPORT" | "RECOVERY" | "CSR_POOL";
export type FundingStatus = "OPEN" | "CLOSED" | "FAILED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type ReimbursementStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
export type PayoutRecipientType = "HOSPITAL" | "CLINIC" | "TRANSPORT_PROVIDER" | "CSR_POOL";
export type PayoutStatus = "PENDING" | "RELEASED";
export type VaccinationStatus = "verified" | "unverified" | "expired";
export type MedicalEntryType = "treatment" | "vaccination" | "surgery" | "observation";
export type TransportStatus = "open" | "assigned" | "completed" | "cancelled";
export type AbuseFlagStatus = "internal_review" | "watch" | "escalated" | "cleared";
export type EducationAudience = "community" | "volunteer" | "hospital" | "citizen";
export type DisappearanceRiskLevel = "stable" | "watch" | "urgent";
export type AdoptionStatus = "pending_review" | "approved" | "trial" | "adopted" | "rejected" | "returned";
export type CsrCommitmentType = "pooled" | "ward" | "module" | "matching";

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: UserRole;
  identityTier?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
}

export interface VisualSignature {
  speciesToken: string;
  colorTokens: string[];
  breedTokens: string[];
  distinguishingTokens: string[];
  photoFingerprint: string;
}

export interface UserRecord {
  id: string;
  phone: string;
  fullName: string | null;
  role: UserRole;
  reputationScore: number;
  activeCaseLimit: number;
  isAvailable: boolean;
  vehicleType: string | null;
  vehicleCapacity: number | null;
  serviceRadiusKm: number;
  homeLocation: LocationInput | null;
  activityCount: number;
  completedCaseCount: number;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnimalPhotoRecord {
  id?: string;
  url: string;
  caption?: string | null;
}

export interface AnimalRecord {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  gender: string | null;
  color: string | null;
  approxAgeMonths: number | null;
  size: string | null;
  temperament: string | null;
  distinguishingMarks: string | null;
  description: string | null;
  status: AnimalStatus;
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  isSterilized: boolean;
  lastSeenText: string | null;
  location: LocationInput;
  territoryLabel: string | null;
  visualSignature: VisualSignature;
  lastSeenAt: Date | null;
  lastConfirmedAliveAt: Date | null;
  seenTodayCount: number;
  disappearanceRiskLevel: DisappearanceRiskLevel;
  vaccinationStatus: VaccinationStatus | null;
  caretakerUserId: string | null;
  createdByUserId: string | null;
  adoptableSince: Date | null;
  adoptionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  distanceKm?: number;
  territoryPopulation?: number;
}

export interface DuplicateCandidate { animal: AnimalRecord; confidence: number; reason: string; }
export interface SightingRecord { id: string; animalId: string | null; reporterUserId: string; matchedAnimalId: string | null; description: string; locationText: string | null; location: LocationInput; photoUrl: string | null; confidenceScore: number | null; createdAt: Date; }
export interface AnimalPresenceRecord { id: string; animalId: string; seenByUserId: string; source: string; observationNotes: string | null; territoryLabel: string | null; location: LocationInput; seenAt: Date; }
export interface VaccinationRecord { id: string; animalId: string; caseId: string | null; administeredByUserId: string | null; vaccineName: string; administeredAt: Date; expiresAt: Date | null; batchNumber: string | null; notes: string | null; verified: boolean; status: VaccinationStatus; createdAt: Date; }
export interface MedicalHistoryRecord { id: string; animalId: string; caseId: string | null; abcEventId: string | null; createdByUserId: string | null; entryType: MedicalEntryType; title: string; notes: string | null; providerName: string | null; treatmentDate: Date; costAmount: number | null; attachments: string[]; createdAt: Date; }

export interface CaseRecord {
  id: string;
  animalId: string | null;
  reporterUserId: string;
  assignedToUserId: string | null;
  caseType: CaseType;
  status: CaseStatus;
  priority: string;
  title: string;
  description: string;
  locationText: string | null;
  location: LocationInput;
  evidenceUrls: string[];
  resolutionNotes: string | null;
  assignmentScore?: number | null;
  assignmentReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  distanceKm?: number;
}

export interface AbcTrackingRecord { id: string; animalId: string; animalName: string | null; caseId: string | null; eventType: AbcEventType; status: string; notes: string | null; location: LocationInput; geoValidated: boolean; unreturnedAlert: boolean; requestedByUserId: string; createdAt: Date; }
export type NotificationPayload = Record<string, unknown>;
export interface NotificationRecord { id: string; userId: string; type: NotificationType; title: string; message: string; payload: NotificationPayload; readAt: Date | null; createdAt: Date; }
export interface MatchSuggestion { type: "animal" | "sighting"; referenceId: string; title: string; summary: string; confidence: number; distanceKm: number; coordinates: LocationInput; photoUrl: string | null; signal: string; territoryLabel?: string | null; }
export interface FundingCaseRecord { id: string; caseId: string; type: FundingType; totalAmount: number; amountRaised: number; status: FundingStatus; createdAt: Date; }
export interface FundingTransactionRecord { id: string; fundingCaseId: string; userId: string; amount: number; paymentStatus: PaymentStatus; isMatched: boolean; matchedBySponsorId: string | null; matchedAmount: number | null; donorName: string | null; isAnonymous: boolean; createdAt: Date; }
export interface ReimbursementRequestRecord { id: string; caseId: string; volunteerId: string; amountClaimed: number; billUrl: string; prescriptionUrl: string; doctorName: string; hospitalId: string; status: ReimbursementStatus; createdAt: Date; }
export interface HospitalVerificationRecord { id: string; reimbursementId: string; hospitalId: string; verified: boolean; notes: string | null; verifiedAt: Date; }
export interface PayoutRecord { id: string; fundingCaseId: string; recipientType: PayoutRecipientType; recipientId: string; amount: number; status: PayoutStatus; createdAt: Date; }
export interface AbuseFlagRecord { id: string; caseId: string | null; animalId: string | null; flaggedByUserId: string | null; severityScore: number; patternKey: string; reason: string; status: AbuseFlagStatus; internalNotes: string | null; createdAt: Date; }
export interface TransportRequestRecord { id: string; caseId: string; animalId: string | null; requestedByUserId: string; assignedToUserId: string | null; vehicleTypeRequired: string | null; patientCondition: string | null; pickupLocation: LocationInput; destinationLocation: LocationInput; status: TransportStatus; slabId: string | null; slabAmountInr: number | null; fundingSource: "responder" | "case_pool" | "csr_pool"; createdAt: Date; completedAt: Date | null; }
export interface VolunteerActivityRecord { id: string; userId: string; activityType: string; referenceId: string | null; pointsDelta: number; notes: string | null; createdAt: Date; }
export interface RescueRouteCandidate { user: UserRecord; distanceKm: number; activeCaseLoad: number; reputationScore: number; routeScore: number; reason: string; }
export interface EducationModule { id: string; topicKey: string; title: string; audience: EducationAudience; summary: string; actionPoints: string[]; triggerCaseType: CaseType | null; triggerAnimalStatus: AnimalStatus | null; languageCode: string; createdAt: Date; }
export interface AnimalInsightRecord { animal: AnimalRecord; sightings: SightingRecord[]; vaccinationRecords: VaccinationRecord[]; medicalHistory: MedicalHistoryRecord[]; recentPresence: AnimalPresenceRecord[]; activeCases: CaseRecord[]; abuseFlags: AbuseFlagRecord[]; educationModules: EducationModule[]; }
export interface CaseOperationsRecord { caseRecord: CaseRecord; routingCandidates: RescueRouteCandidate[]; transportRequests: TransportRequestRecord[]; abuseFlags: AbuseFlagRecord[]; relatedFunding: FundingCaseRecord[]; legalGuidance: EducationModule[]; }
export interface FundingOverviewRecord { openFundingCount: number; closedFundingCount: number; pendingPayoutCount: number; reimbursementOpenCount: number; escrowBalance: number; recentFunding: FundingCaseRecord[]; }
export interface TransportSlab { id: string; label: string; amountInr: number; maxDistKm: number | null; isActive: boolean; createdAt: Date; }
export interface RecoveryFundingRecord { id: string; caseId: string; animalId: string | null; dailyCostInr: number; providerName: string | null; providerType: "foster" | "ngo_shelter" | "clinic"; startDate: string; endDate: string | null; totalRaised: number; status: "active" | "completed" | "cancelled"; createdByUserId: string | null; createdAt: Date; updatedAt: Date; daysElapsed?: number; totalCostSoFar?: number; }
export interface CsrSponsorRecord { id: string; orgName: string; contactName: string | null; contactEmail: string | null; contactPhone: string | null; registrationNumber: string | null; commitmentType: CsrCommitmentType; committedAmountInr: number; disbursedAmountInr: number; matchingRatio: number | null; matchingCapInr: number | null; activeFrom: string; activeUntil: string | null; isActive: boolean; notes: string | null; createdAt: Date; updatedAt: Date; totalAllocated?: number; casesFunded?: number; }
export interface CsrWardSponsorshipRecord { id: string; sponsorId: string; wardName: string; monthlyBudgetInr: number; month: string; spentInr: number; caseCount: number; isActive: boolean; remainingBudget: number; createdAt: Date; }
export interface CsrTransactionRecord { id: string; sponsorId: string; fundingCaseId: string | null; caseId: string | null; wardName: string | null; amountInr: number; transactionType: "case_allocation" | "matching" | "transport" | "recovery" | "ward_pool"; referenceNote: string | null; isMatching: boolean; createdAt: Date; }
export interface AdoptionApplicationRecord { id: string; animalId: string; applicantUserId: string; reviewedByUserId: string | null; fullName: string; phone: string; address: string; livingSituation: "house_with_yard" | "apartment" | "shared_accommodation" | "other"; hasOtherPets: boolean; otherPetsDesc: string | null; priorExperience: "none" | "some" | "experienced"; hoursAlonePerDay: number; reasonForAdopting: string; status: AdoptionStatus; rejectionReason: string | null; reviewNotes: string | null; trialStartDate: string | null; trialEndDate: string | null; trialCheckNotes: string | null; adoptionFeeInr: number; feePaid: boolean; agreementAcceptedAt: Date | null; agreementTextHash: string | null; followupDoneAt: Date | null; followupNotes: string | null; createdAt: Date; updatedAt: Date; }
export interface AdopterBlacklistRecord { id: string; userId: string | null; phone: string | null; reason: string; flaggedByUserId: string | null; flaggedAt: Date; isActive: boolean; }
