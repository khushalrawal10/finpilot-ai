import { create } from 'zustand';

// ============================================================
// Types
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  defaultCurrency: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================================
// Store
// ============================================================

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user: AuthUser) => set({ user, isLoading: false }),
  clearUser: () => set({ user: null, isLoading: false }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

// ============================================================
// Selector Hooks
// ============================================================

export const useAuthUser = (): AuthUser | null =>
  useAuthStore((state) => state.user);

export const useIsAuthenticated = (): boolean =>
  useAuthStore((state) => state.user !== null);

export default useAuthStore;
