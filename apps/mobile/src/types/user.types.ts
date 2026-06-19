export type UserRole = "citizen" | "ngo" | "govt" | "admin" | "hospital";

export interface User {
  id: string;
  phone: string;
  fullName: string | null;
  role: UserRole;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export type NotificationType = "auth" | "animal" | "case" | "abc" | "conflict" | "system";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface LegalSection {
  title: string;
  summary: string;
  actions: string[];
}

export interface LegalContent {
  updatedAt: string;
  sections: LegalSection[];
}
