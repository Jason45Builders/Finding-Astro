/**
 * auth.service.ts — FIXED (MOBILE)
 * Role removed from requestOtp. Push token registered after login.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./api";
import { EXPO_PROJECT_ID, SESSION_STORAGE_KEY } from "../utils/constants";
import * as Notifications from "expo-notifications";
import { AuthSession } from "../types/user.types";

interface RequestOtpResponse {
  phone: string;
  expiresInMinutes: number;
  code?: string; // only present in dev builds
}

class AuthService {
  async requestOtp(phone: string, fullName?: string): Promise<RequestOtpResponse> {
    return apiRequest<RequestOtpResponse>("/auth/request-otp", {
      method: "POST",
      skipAuth: true,
      body: {
        phone,
        fullName,
        // SECURITY FIX: role removed — was role: "citizen"
        // Backend enforces citizen as default. Sending it from the client
        // was a hole where any user could pass role: "ngo" instead.
      },
    });
  }

  async verifyOtp(phone: string, code: string): Promise<AuthSession> {
    const session = await apiRequest<AuthSession>("/auth/verify-otp", {
      method: "POST",
      skipAuth: true,
      body: { phone, code },
    });

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    // Register push token after login (non-fatal if it fails)
    this.registerPushToken(session.token).catch(() => {});

    return session;
  }

  async registerPushToken(token: string): Promise<void> {
    try {
      const permissions = await Notifications.getPermissionsAsync() as unknown as {
        granted?: boolean;
        ios?: { status?: number };
      };
      const granted = permissions.granted ?? permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      let finalStatus = granted;

      if (!granted) {
        const requestedPermissions = await Notifications.requestPermissionsAsync() as unknown as {
          granted?: boolean;
          ios?: { status?: number };
        };
        const newGranted = requestedPermissions.granted ?? requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        finalStatus = newGranted;
      }

      if (!finalStatus) return;
      if (!EXPO_PROJECT_ID) return;

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });

      await apiRequest("/auth/push-token", {
        method: "POST",
        token,
        body: { token: pushToken.data },
      });
    } catch {
      // Non-fatal — app works without push notifications
    }
  }

  async loadSession(): Promise<AuthSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }

  async validateSession(token: string): Promise<boolean> {
    try {
      await apiRequest("/auth/me", { token });
      return true;
    } catch {
      await this.clearSession();
      return false;
    }
  }

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export const authService = new AuthService();
