import { create } from "zustand";
import { api, User } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
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
      await api.signup(email, password, fullName);
      const res = await api.login(email, password);
      set({ user: res.user, token: res.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await api.logout?.();
    set({ user: null, token: null, isLoading: false });
  },

  bootstrap: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      set({ user, token: null, isLoading: false });
    } catch {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
