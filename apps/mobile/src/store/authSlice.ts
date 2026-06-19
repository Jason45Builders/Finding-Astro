import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthSession } from "../types/user.types";

interface AuthState {
  session: AuthSession | null;
  isBootstrapping: boolean;
  onboardingComplete: boolean;
  otpPhone: string | null;
  lastMockOtp: string | null;
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  isBootstrapping: true,
  onboardingComplete: false,
  otpPhone: null,
  lastMockOtp: null,
  error: null
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setBootstrapping(state, action: PayloadAction<boolean>) {
      state.isBootstrapping = action.payload;
    },
    setSession(state, action: PayloadAction<AuthSession | null>) {
      state.session = action.payload;
      state.error = null;
    },
    clearSession(state) {
      state.session = null;
      state.otpPhone = null;
      state.lastMockOtp = null;
    },
    setOtpRequest(
      state,
      action: PayloadAction<{
        phone: string;
        code?: string;
      }>
    ) {
      state.otpPhone = action.payload.phone;
      state.lastMockOtp = action.payload.code ?? null;
      state.error = null;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    completeOnboarding(state) {
      state.onboardingComplete = true;
    }
  }
});

export const {
  setBootstrapping,
  setSession,
  clearSession,
  setOtpRequest,
  setAuthError,
  completeOnboarding
} = authSlice.actions;

export default authSlice.reducer;
