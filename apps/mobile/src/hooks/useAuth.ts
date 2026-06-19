import { useCallback } from "react";
import { authService } from "../services/auth.service";
import {
  clearSession,
  completeOnboarding,
  setAuthError,
  setBootstrapping,
  setOtpRequest,
  setSession
} from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  const bootstrap = useCallback(async () => {
    dispatch(setBootstrapping(true));

    try {
      const session = await authService.loadSession();
      dispatch(setSession(session));
    } catch (error) {
      dispatch(setAuthError(error instanceof Error ? error.message : "Unable to restore session."));
    } finally {
      dispatch(setBootstrapping(false));
    }
  }, [dispatch]);

  const requestOtp = useCallback(
    async (phone: string, fullName?: string) => {
      try {
        const payload = await authService.requestOtp(phone, fullName);
        dispatch(setOtpRequest({ phone: payload.phone, code: payload.code }));
        dispatch(setAuthError(null));
        return payload;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to request OTP.";
        dispatch(setAuthError(message));
        throw error;
      }
    },
    [dispatch]
  );

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      try {
        const session = await authService.verifyOtp(phone, code);
        dispatch(setSession(session));
        dispatch(completeOnboarding());
        return session;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to verify OTP.";
        dispatch(setAuthError(message));
        throw error;
      }
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await authService.clearSession();
    dispatch(clearSession());
  }, [dispatch]);

  return {
    ...authState,
    bootstrap,
    requestOtp,
    verifyOtp,
    logout
  };
};
