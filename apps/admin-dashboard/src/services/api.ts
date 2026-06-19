const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
const TOKEN_STORAGE_KEY = "finding-astro-dashboard-token";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface User {
  id: string;
  phone: string;
  fullName: string | null;
  role: "citizen" | "ngo" | "govt" | "admin";
  tier?: string;
  reputation?: number;
  banned?: boolean;
  identityVerified?: boolean;
  identityDocumentUrl?: string | null;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface Animal {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  color: string | null;
  status: string;
  lastSeenText: string | null;
  isSterilized: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseRecord {
  id: string;
  animalId: string | null;
  reporterUserId: string;
  assignedToUserId: string | null;
  caseType: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  locationText: string | null;
  evidenceUrls: string[];
  resolutionNotes: string | null;
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
  status: string;
  actionTaken: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbcEvent {
  id: string;
  animalId: string;
  animalName: string | null;
  caseId: string | null;
  eventType: string;
  status: string;
  notes: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  geoValidated: boolean;
  requestedByUserId: string;
  createdAt: string;
}

export interface Responder {
  id: string;
  fullName: string | null;
  phone: string;
  role: string;
  tier: string;
  reputation: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  activeCaseCount: number;
  totalCasesCompleted: number;
  isAvailable: boolean;
  updatedAt: string;
}

export interface FundingCase {
  id: string;
  caseId: string | null;
  fundingType: string;
  totalAmount: number;
  raisedAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  hospitalName?: string | null;
  verifierName?: string | null;
}

export interface Transaction {
  id: string;
  fundingCaseId: string;
  userId: string;
  userName: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

export interface ReimbursementRequest {
  id: string;
  fundingCaseId: string;
  requesterUserId: string;
  requesterName: string | null;
  amount: number;
  status: string;
  hospitalVerified: boolean;
  documents: string[];
  createdAt: string;
  updatedAt: string;
}

export type PartnerType = "clinic" | "store" | "ngo" | "helpline" | "abc_centre" | "wildlife_centre";

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: "pending" | "approved" | "rejected";
  verifiedByUserId: string | null;
  services: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WardSummary {
  wardNumber: string;
  wardName: string;
  animalCount: number;
  abcCoveragePercent: number;
  vaccinationRatePercent: number;
  openCases: number;
  avgResponseHours: number | null;
}

export interface EducationContent {
  id: string;
  title: string;
  body: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviourGuidanceCard {
  id: string;
  title: string;
  body: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HelplineEntry {
  id: string;
  name: string;
  number: string;
  area: string | null;
  availableHours: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertNotification {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  read: boolean;
}

export interface MonthlyResolvedCases {
  month: string;
  resolved: number;
  opened: number;
}

const getStoredToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setStoredToken = (token: string): void => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
};

export const clearStoredToken = (): void => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const apiRequest = async <T>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.message ?? "API request failed");
  }

  return payload.data;
};

export const dashboardApi = {
  getToken: (): string | null => getStoredToken(),

  requestOtp: async (phone: string, fullName: string): Promise<{ phone: string; code?: string }> =>
    apiRequest("/auth/request-otp", {
      method: "POST",
      body: { phone, fullName }
    }),

  verifyOtp: async (phone: string, code: string): Promise<AuthSession> => {
    const session = await apiRequest<AuthSession>("/auth/verify-otp", {
      method: "POST",
      body: { phone, code }
    });
    setStoredToken(session.token);
    return session;
  },

  getMe: async (): Promise<User> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<User>("/auth/me", { token });
  },

  /* Animals */
  listAnimals: async (): Promise<Animal[]> => apiRequest<Animal[]>("/animals?limit=100"),

  /* Cases */
  listCases: async (status?: string): Promise<CaseRecord[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    const query = status ? `?status=${status}&limit=200` : "?limit=200";
    return apiRequest<CaseRecord[]>(`/cases${query}`, { token });
  },

  getCase: async (caseId: string): Promise<CaseRecord> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseRecord>(`/cases/${caseId}`, { token });
  },

  updateCase: async (caseId: string, payload: Partial<Pick<CaseRecord, "status" | "priority" | "resolutionNotes">>): Promise<CaseRecord> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseRecord>(`/cases/${caseId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },

  /* Case timeline */
  listCaseEvents: async (caseId: string): Promise<CaseEvent[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseEvent[]>(`/cases/${caseId}/events`, { token });
  },

  listCaseResponses: async (caseId: string): Promise<CaseResponse[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseResponse[]>(`/cases/${caseId}/responses`, { token });
  },

  issueVerdict: async (caseId: string, verdict: string): Promise<CaseRecord> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseRecord>(`/cases/${caseId}/verdict`, {
      method: "POST",
      token,
      body: { verdict }
    });
  },

  releaseHeldCase: async (caseId: string): Promise<CaseRecord> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseRecord>(`/cases/${caseId}/release`, {
      method: "POST",
      token
    });
  },

  /* ABC */
  listAbcTracking: async (): Promise<AbcEvent[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<AbcEvent[]>("/abc/tracking", { token });
  },

  logAbcEvent: async (payload: {
    animalId: string;
    caseId?: string | null;
    eventType: "capture" | "surgery" | "return";
    status: string;
    notes?: string | null;
    location: { latitude: number; longitude: number };
  }): Promise<AbcEvent> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<AbcEvent>("/abc/events", {
      method: "POST",
      token,
      body: payload
    });
  },

  /* Dispatch / Responders */
  listResponders: async (): Promise<Responder[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<Responder[]>("/responders?limit=200", { token });
  },

  assignCase: async (caseId: string, responderId: string): Promise<CaseRecord> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<CaseRecord>(`/cases/${caseId}/assign`, {
      method: "POST",
      token,
      body: { responderId }
    });
  },

  /* Funding */
  listFundingCases: async (): Promise<FundingCase[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<FundingCase[]>("/funding?limit=200", { token });
  },

  listFundingTransactions: async (fundingCaseId: string): Promise<Transaction[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<Transaction[]>(`/funding/${fundingCaseId}/transactions`, { token });
  },

  listReimbursements: async (): Promise<ReimbursementRequest[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<ReimbursementRequest[]>("/funding/reimbursements?limit=200", { token });
  },

  releasePayout: async (fundingCaseId: string): Promise<FundingCase> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<FundingCase>(`/funding/${fundingCaseId}/release-payout`, {
      method: "POST",
      token
    });
  },

  /* Partners */
  listPartners: async (type?: PartnerType): Promise<Partner[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    const query = type ? `?type=${type}&limit=200` : "?limit=200";
    return apiRequest<Partner[]>(`/partners${query}`, { token });
  },

  updatePartnerStatus: async (partnerId: string, status: "approved" | "rejected"): Promise<Partner> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<Partner>(`/partners/${partnerId}/verify`, {
      method: "POST",
      token,
      body: { status }
    });
  },

  createPartner: async (payload: Omit<Partner, "id" | "createdAt" | "updatedAt" | "verifiedByUserId">): Promise<Partner> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<Partner>("/partners", {
      method: "POST",
      token,
      body: payload
    });
  },

  /* Users */
  listUsers: async (): Promise<User[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<User[]>("/users?limit=500", { token });
  },

  banUser: async (userId: string, ban: boolean): Promise<User> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<User>(`/users/${userId}/ban`, {
      method: "POST",
      token,
      body: { ban }
    });
  },

  upgradeRole: async (userId: string, role: User["role"]): Promise<User> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<User>(`/users/${userId}/role`, {
      method: "PATCH",
      token,
      body: { role }
    });
  },

  verifyIdentity: async (userId: string, verified: boolean): Promise<User> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<User>(`/users/${userId}/verify-identity`, {
      method: "POST",
      token,
      body: { verified }
    });
  },

  /* Wards */
  listWardSummaries: async (): Promise<WardSummary[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<WardSummary[]>("/wards/summary", { token });
  },

  /* Content */
  listEducationContent: async (): Promise<EducationContent[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<EducationContent[]>("/content/education?limit=200", { token });
  },

  createEducationContent: async (payload: Omit<EducationContent, "id" | "createdAt" | "updatedAt">): Promise<EducationContent> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<EducationContent>("/content/education", {
      method: "POST",
      token,
      body: payload
    });
  },

  updateEducationContent: async (id: string, payload: Partial<Omit<EducationContent, "id" | "createdAt" | "updatedAt">>): Promise<EducationContent> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<EducationContent>(`/content/education/${id}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },

  deleteEducationContent: async (id: string): Promise<void> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    await apiRequest<void>(`/content/education/${id}`, { method: "DELETE", token });
  },

  listBehaviourGuidance: async (): Promise<BehaviourGuidanceCard[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<BehaviourGuidanceCard[]>("/content/behaviour?limit=200", { token });
  },

  createBehaviourGuidance: async (payload: Omit<BehaviourGuidanceCard, "id" | "createdAt" | "updatedAt">): Promise<BehaviourGuidanceCard> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<BehaviourGuidanceCard>("/content/behaviour", {
      method: "POST",
      token,
      body: payload
    });
  },

  updateBehaviourGuidance: async (id: string, payload: Partial<Omit<BehaviourGuidanceCard, "id" | "createdAt" | "updatedAt">>): Promise<BehaviourGuidanceCard> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<BehaviourGuidanceCard>(`/content/behaviour/${id}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },

  deleteBehaviourGuidance: async (id: string): Promise<void> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    await apiRequest<void>(`/content/behaviour/${id}`, { method: "DELETE", token });
  },

  listHelplines: async (): Promise<HelplineEntry[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<HelplineEntry[]>("/content/helplines?limit=200", { token });
  },

  createHelpline: async (payload: Omit<HelplineEntry, "id" | "createdAt" | "updatedAt">): Promise<HelplineEntry> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<HelplineEntry>("/content/helplines", {
      method: "POST",
      token,
      body: payload
    });
  },

  updateHelpline: async (id: string, payload: Partial<Omit<HelplineEntry, "id" | "createdAt" | "updatedAt">>): Promise<HelplineEntry> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<HelplineEntry>(`/content/helplines/${id}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },

  deleteHelpline: async (id: string): Promise<void> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    await apiRequest<void>(`/content/helplines/${id}`, { method: "DELETE", token });
  },

  /* Dashboard stats */
  listAlerts: async (): Promise<AlertNotification[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<AlertNotification[]>("/dashboard/alerts?limit=20", { token });
  },

  monthlyResolvedCases: async (): Promise<MonthlyResolvedCases[]> => {
    const token = getStoredToken();
    if (!token) throw new Error("No dashboard session found.");
    return apiRequest<MonthlyResolvedCases[]>("/dashboard/monthly-cases", { token });
  },

  logout: (): void => {
    clearStoredToken();
  }
};
