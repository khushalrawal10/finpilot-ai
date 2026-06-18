import { useState, useCallback } from 'react';
import { z } from 'zod';
import { supabase } from '@core/network/supabase-client';
import { SupabaseAuthRepository } from '@features/auth/data/repositories/SupabaseAuthRepository';
import useAuthStore from '@core/di/stores/authStore';

// ============================================================
// Validation
// ============================================================

const credentialsSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ============================================================
// Repository instance
// ============================================================

const authRepo = new SupabaseAuthRepository(supabase);

// ============================================================
// Hook
// ============================================================

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAuthActions(): AuthActions {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setIsLoading(true);

      try {
        const parsed = credentialsSchema.safeParse({ email, password });
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed');
        }

        const user = await authRepo.signIn(email, password);
        setUser({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          defaultCurrency: user.defaultCurrency,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const register = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      setIsLoading(true);

      try {
        const parsed = credentialsSchema.safeParse({ email, password });
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? 'Validation failed');
        }

        const user = await authRepo.signUp(email, password);
        setUser({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          defaultCurrency: user.defaultCurrency,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      await authRepo.signOut();
      clearUser();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [clearUser]);

  return { login, register, logout, isLoading, error };
}
