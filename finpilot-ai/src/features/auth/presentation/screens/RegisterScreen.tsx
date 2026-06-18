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

import T from '@shared/theme';
import { Button, AppTextInput } from '@shared/components';
import { useAuthActions } from '@features/auth/presentation/hooks/useAuthActions';

// ============================================================
// Schema
// ============================================================

const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================
// Navigation type
// ============================================================

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type RegisterNavProp = StackNavigationProp<AuthStackParamList, 'Register'>;

// ============================================================
// Screen
// ============================================================

export default function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<RegisterNavProp>();
  const { register, isLoading, error } = useAuthActions();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      await register(data.email, data.password);
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
      >
        <View style={styles.header}>
          <Text style={styles.logo}>FinPilot</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
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
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                secureTextEntry
                error={errors.confirmPassword?.message}
              />
            )}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonWrapper}>
            <Button
              label="Create Account"
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              size="lg"
              loading={isLoading}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Login</Text>
          </Pressable>
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
    backgroundColor: T.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: T.spacing.lg,
    paddingVertical: T.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: T.spacing.xxl,
  },
  logo: {
    fontSize: T.fontSize.xxxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.primary,
    marginBottom: T.spacing.xs,
  },
  subtitle: {
    fontSize: T.fontSize.md,
    color: T.colors.textMuted,
  },
  form: {
    marginBottom: T.spacing.xl,
  },
  errorText: {
    fontSize: T.fontSize.sm,
    color: T.colors.error,
    textAlign: 'center',
    marginBottom: T.spacing.md,
  },
  buttonWrapper: {
    marginTop: T.spacing.sm,
  },
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
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.primary,
  },
});
