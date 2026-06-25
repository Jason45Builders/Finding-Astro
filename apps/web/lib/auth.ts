import { create } from "zustand";
import { api, User } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.login(email, password);
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signup: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      // 1. Sign up on backend (returns only { email })
      await api.signup(email, password, fullName);
      // 2. Immediately login with the same credentials to retrieve session JWT
      const res = await api.login(email, password);
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, token: null, isLoading: false });
  },

  bootstrap: async () => {
    set({ isLoading: true });
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("fa_token") : null;
      if (token) {
        api.setToken(token);
        const user = await api.getMe();
        set({ user, token, isLoading: false });
      } else {
        set({ user: null, token: null, isLoading: false });
      }
    } catch (err) {
      // Clear expired or invalid session token
      api.setToken(null);
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
