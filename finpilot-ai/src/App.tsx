import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';

import { supabase } from '@core/network/supabase-client';
import useAuthStore from '@core/di/stores/authStore';
import { SupabaseAuthRepository } from '@features/auth/data/repositories/SupabaseAuthRepository';
import AppNavigator from '@navigation/AppNavigator';

// ============================================================
// Query Client
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================
// Auth Repository
// ============================================================

const authRepo = new SupabaseAuthRepository(supabase);

// ============================================================
// Auth Initializer
// ============================================================

function useAuthInit(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async (): Promise<void> => {
      try {
        const user = await authRepo.getCurrentUser();
        if (!isMounted) return;

        if (user) {
          setUser({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            defaultCurrency: user.defaultCurrency,
          });
        } else {
          clearUser();
        }
      } catch {
        if (isMounted) {
          clearUser();
        }
      }
    };

    void initAuth();

    // Listen for auth state changes (sign-in from another tab, token refresh, etc.)
    const unsubscribe = authRepo.onAuthStateChange((user) => {
      if (!isMounted) return;

      if (user) {
        setUser({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          defaultCurrency: user.defaultCurrency,
        });
      } else {
        clearUser();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [setUser, clearUser, setLoading]);
}

// ============================================================
// App Component
// ============================================================

export default function App(): React.JSX.Element {
  useAuthInit();

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
