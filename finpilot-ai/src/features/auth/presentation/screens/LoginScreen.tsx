import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import T from '@shared/theme';
import { Button, AppTextInput } from '@shared/components';
import { useAuthActions } from '@features/auth/presentation/hooks/useAuthActions';

// ============================================================
// Schema
// ============================================================

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================
// Navigation type
// ============================================================

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type LoginNavProp = StackNavigationProp<AuthStackParamList, 'Login'>;

// ============================================================
// Screen
// ============================================================

export default function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<LoginNavProp>();
  const { login, isLoading, error } = useAuthActions();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      await login(data.email, data.password);
    } catch {
      // error state handled by useAuthActions
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Ionicons name="trending-up" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>FinPilot</Text>
          <Text style={styles.tagline}>Your AI Finance Co-pilot</Text>
        </View>

        {/* Form card */}
        <View style={styles.formCard}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to continue</Text>

          <View style={styles.formFields}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  error={errors.email?.message}
                  leftIcon={<Ionicons name="mail-outline" size={18} color={T.colors.textMuted} />}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  secureTextEntry
                  error={errors.password?.message}
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={T.colors.textMuted} />}
                />
              )}
            />

            <Pressable style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              label="Sign In"
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              size="lg"
              loading={isLoading}
              style={styles.signInButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Register</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.colors.primaryDark,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero
  hero: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 48,
    backgroundColor: T.colors.primaryDark,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 14,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },

  // Form card
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: T.colors.text,
  },
  welcomeSub: {
    fontSize: 14,
    fontWeight: '400',
    color: T.colors.textMuted,
    marginTop: 4,
    marginBottom: 28,
  },
  formFields: {
    marginBottom: 8,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.primary,
  },
  errorText: {
    fontSize: 13,
    color: T.colors.error,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: 16,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: T.colors.textMuted,
    marginHorizontal: 12,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: T.fontSize.sm,
    color: T.colors.textMuted,
  },
  footerLink: {
    fontSize: T.fontSize.sm,
    fontWeight: '600',
    color: T.colors.primary,
  },
});
