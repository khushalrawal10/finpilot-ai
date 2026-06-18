import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@core/network/supabase-client';
import useAuthStore from '@core/di/stores/authStore';
import { SupabaseAuthRepository } from '@features/auth/data/repositories/SupabaseAuthRepository';
import AppNavigator from '@navigation/AppNavigator';
import T from '@shared/theme';

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

function useAuthInit(): { authReady: boolean } {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [authReady, setAuthReady] = useState(false);

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
      } finally {
        if (isMounted) {
          setAuthReady(true);
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

  return { authReady };
}

// ============================================================
// Splash Screen
// ============================================================

function SplashScreen(): React.JSX.Element {
  return (
    <View style={splashStyles.container}>
      <Text style={splashStyles.logo}>💰</Text>
      <Text style={splashStyles.title}>FinPilot</Text>
      <Text style={splashStyles.subtitle}>Your AI Finance Assistant</Text>
      <ActivityIndicator
        size="large"
        color={T.colors.primary}
        style={splashStyles.spinner}
      />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.background,
  },
  logo: {
    fontSize: 64,
    marginBottom: T.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
    marginBottom: T.spacing.xs,
  },
  subtitle: {
    fontSize: T.fontSize.md,
    color: T.colors.textMuted,
    marginBottom: T.spacing.xl,
  },
  spinner: {
    marginTop: T.spacing.lg,
  },
});

// ============================================================
// App Component
// ============================================================

export default function App(): React.JSX.Element {
  const { authReady } = useAuthInit();

  if (!authReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SplashScreen />
      </GestureHandlerRootView>
    );
  }

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
