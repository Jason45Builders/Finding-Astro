/**
 * api.ts — COMPLETE REPLACEMENT (MOBILE)
 * Token auto-loaded from storage. 401 auto-clears session.
 * Retry logic (3 attempts) and 15s timeout for poor connections.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { SESSION_STORAGE_KEY, API_BASE_URL } from "../utils/constants";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fields?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    fields?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

interface ApiOptions {
  method?:    "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?:      unknown;
  token?:     string;
  skipAuth?:  boolean;
  retries?:   number;
  timeoutMs?: number;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void): void => {
  onUnauthorized = handler;
};

const loadToken = async (): Promise<string | null> => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
};

export const apiRequest = async <T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> => {
  const { method = "GET", body, skipAuth = false, retries = 2, timeoutMs = 15_000 } = options;

  const token = options.token ?? (!skipAuth ? await loadToken() : null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE_URL}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 500));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 204) return null as unknown as T;

      const json = await response.json().catch(() => null);

      if (response.status === 401) {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        onUnauthorized?.();
        throw new ApiError(
          json?.message ?? "Session expired. Please log in again.",
          401,
          json?.code ?? "UNAUTHORIZED"
        );
      }

      if (!response.ok) {
        throw new ApiError(
          json?.message ?? `Request failed (${response.status})`,
          response.status,
          json?.code ?? "REQUEST_FAILED",
          json?.fields
        );
      }

      return (json as ApiSuccessResponse<T>).data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError("Request timed out. Please check your connection.", 408, "TIMEOUT");
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) continue;
      throw new ApiError("Network error. Please check your connection.", 0, "NETWORK_ERROR");
    }
  }

  throw lastError ?? new ApiError("Unknown error", 0, "UNKNOWN");
};
