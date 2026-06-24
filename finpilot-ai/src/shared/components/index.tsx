import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import T from '@shared/theme';

// ============================================================
// BUTTON
// ============================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const buttonHeights: Record<ButtonSize, number> = {
  sm: 40,
  md: 48,
  lg: 52,
};

const buttonFontSizes: Record<ButtonSize, number> = {
  sm: T.fontSize.sm,
  md: T.fontSize.md,
  lg: T.fontSize.md,
};

const buttonPaddingH: Record<ButtonSize, number> = {
  sm: T.spacing.md,
  md: T.spacing.lg,
  lg: T.spacing.xl,
};

export const Button = React.memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'secondary'
        ? T.colors.primary
        : T.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        buttonStyles.base,
        {
          height: buttonHeights[size],
          paddingHorizontal: buttonPaddingH[size],
          borderRadius: 12,
        },
        buttonStyles[variant],
        isDisabled ? buttonStyles.disabled : undefined,
        pressed && !isDisabled ? buttonStyles.pressed : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : T.colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            buttonStyles.label,
            {
              fontSize: buttonFontSizes[size],
              color: textColor,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
});

const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: T.colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: T.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: T.colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// ============================================================
// APP TEXT INPUT
// ============================================================

interface AppTextInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  leftIcon?: React.ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const AppTextInput = React.memo(function AppTextInput({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  leftIcon,
  autoCapitalize = 'none',
}: AppTextInputProps) {
  const [focused, setFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  const hasError = Boolean(error);

  return (
    <View style={inputStyles.wrapper}>
      {label ? <Text style={inputStyles.label}>{label}</Text> : null}

      <View
        style={[
          inputStyles.container,
          focused ? inputStyles.containerFocused : undefined,
          hasError ? inputStyles.containerError : undefined,
        ]}
      >
        {leftIcon ? <View style={inputStyles.iconWrapper}>{leftIcon}</View> : null}

        <TextInput
          style={[
            inputStyles.input,
            leftIcon ? inputStyles.inputWithIcon : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.colors.textMuted}
          secureTextEntry={secureTextEntry && hidePassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidePassword((prev) => !prev)}
            style={inputStyles.eyeButton}
            hitSlop={8}
          >
            <Ionicons
              name={hidePassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={T.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {hasError ? <Text style={inputStyles.error}>{error}</Text> : null}
    </View>
  );
});

const inputStyles = StyleSheet.create({
  wrapper: {
    marginBottom: T.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.textSecondary,
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: 12,
    backgroundColor: T.colors.background,
    height: 52,
    paddingHorizontal: T.spacing.md,
  },
  containerFocused: {
    borderColor: T.colors.primary,
    borderWidth: 1.5,
  },
  containerError: {
    borderColor: T.colors.error,
    borderWidth: 1.5,
  },
  iconWrapper: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: T.fontSize.md,
    color: T.colors.text,
    height: '100%' as unknown as number,
    padding: 0,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  eyeButton: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
  error: {
    fontSize: T.fontSize.xs,
    color: T.colors.error,
    marginTop: T.spacing.xs,
  },
});

// ============================================================
// CARD
// ============================================================

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card = React.memo(function Card({
  children,
  onPress,
  style,
}: CardProps) {
  const content = (
    <View style={[cardStyles.container, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => (pressed ? cardStyles.pressed : undefined)}
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: T.colors.background,
    borderRadius: 16,
    padding: T.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.98 }],
  },
});

// ============================================================
// EMPTY STATE
// ============================================================

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const EmptyState = React.memo(function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  iconName,
}: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      {iconName ? (
        <View style={emptyStyles.iconCircle}>
          <Ionicons name={iconName} size={36} color={T.colors.border} />
        </View>
      ) : null}

      <Text style={emptyStyles.title}>{title}</Text>

      {subtitle ? (
        <Text style={emptyStyles.subtitle}>{subtitle}</Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            emptyStyles.actionButton,
            pressed ? emptyStyles.actionPressed : undefined,
          ]}
        >
          <Text style={emptyStyles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: T.spacing.xl,
    paddingVertical: T.spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: T.colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: T.spacing.sm,
  },
  subtitle: {
    fontSize: T.fontSize.sm,
    color: T.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: T.spacing.lg,
  },
  actionButton: {
    backgroundColor: T.colors.primary,
    borderRadius: T.radius.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
