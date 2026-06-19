import { Coordinates } from "./animal.types";

export type CaseType = "rescue" | "abuse" | "conflict" | "lost_pet" | "abc" | "wildlife";
export type CaseStatus = "open" | "in_review" | "action_taken" | "resolved" | "closed" | "VERIFIED_REIMBURSEMENT";

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
  location: Coordinates;
  evidenceUrls: string[];
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseFormValues {
  animalId?: string | null;
  assignedToUserId?: string | null;
  caseType: CaseType;
  status?: CaseStatus;
  priority?: string;
  title: string;
  description: string;
  locationText?: string | null;
  location: Coordinates;
  evidenceUrls?: string[];
  resolutionNotes?: string | null;
}

export interface AbcEvent {
  id: string;
  animalId: string;
  animalName: string | null;
  caseId: string | null;
  eventType: "request" | "capture" | "surgery" | "return";
  status: string;
  notes: string | null;
  location: Coordinates;
  geoValidated: boolean;
  requestedByUserId: string;
  createdAt: string;
}

export interface ConflictResult {
  caseRecord: CaseRecord;
  suggestedActions: string[];
}
