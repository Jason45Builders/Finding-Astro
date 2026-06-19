import { CaseRecord, AbcEvent, CaseFormValues, ConflictResult } from "../types/case.types";
import { LegalContent } from "../types/user.types";
import { apiRequest } from "./api";

class CaseService {
  async listCases(
    token: string,
    filters: Partial<{ caseType: string; status: string; animalId: string }>
  ): Promise<CaseRecord[]> {
    const searchParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });

    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<CaseRecord[]>(`/cases${suffix}`, { token });
  }

  async createCase(token: string, payload: CaseFormValues): Promise<CaseRecord> {
    return apiRequest<CaseRecord>("/cases", {
      method: "POST",
      token,
      body: payload
    });
  }

  async updateCase(token: string, caseId: string, payload: Partial<CaseFormValues>): Promise<CaseRecord> {
    return apiRequest<CaseRecord>(`/cases/${caseId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  }

  async createAbcRequest(
    token: string,
    payload: {
      animalId: string;
      notes?: string | null;
      locationText?: string | null;
      location: {
        latitude: number;
        longitude: number;
      };
    }
  ): Promise<AbcEvent> {
    return apiRequest<AbcEvent>("/abc/requests", {
      method: "POST",
      token,
      body: payload
    });
  }

  async logAbcEvent(
    token: string,
    payload: {
      animalId: string;
      caseId?: string | null;
      eventType: "request" | "capture" | "surgery" | "return";
      status: string;
      notes?: string | null;
      location: {
        latitude: number;
        longitude: number;
      };
    }
  ): Promise<AbcEvent> {
    return apiRequest<AbcEvent>("/abc/events", {
      method: "POST",
      token,
      body: payload
    });
  }

  async getAbcTracking(token: string, animalId?: string): Promise<AbcEvent[]> {
    const suffix = animalId ? `?animalId=${animalId}` : "";
    return apiRequest<AbcEvent[]>(`/abc/tracking${suffix}`, { token });
  }

  async submitConflict(
    token: string,
    payload: {
      title: string;
      description: string;
      severity: "low" | "medium" | "high";
      locationText?: string | null;
      location: {
        latitude: number;
        longitude: number;
      };
      evidenceUrls?: string[];
    }
  ): Promise<ConflictResult> {
    return apiRequest<ConflictResult>("/conflicts", {
      method: "POST",
      token,
      body: payload
    });
  }

  async listConflicts(token: string): Promise<CaseRecord[]> {
    return apiRequest<CaseRecord[]>("/conflicts", { token });
  }

  async getLegalContent(): Promise<LegalContent> {
    return apiRequest<LegalContent>("/legal");
  }
}

export const caseService = new CaseService();
