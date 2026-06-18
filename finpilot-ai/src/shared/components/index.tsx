import React from 'react';
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
}

const buttonHeights: Record<ButtonSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

const buttonFontSizes: Record<ButtonSize, number> = {
  sm: T.fontSize.sm,
  md: T.fontSize.md,
  lg: T.fontSize.lg,
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
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    buttonStyles.base,
    {
      height: buttonHeights[size],
      paddingHorizontal: buttonPaddingH[size],
      borderRadius: T.radius.md,
    },
    buttonStyles[variant],
    isDisabled ? buttonStyles.disabled : undefined,
  ].filter(Boolean) as ViewStyle[];

  const textColor = variant === 'primary' || variant === 'danger'
    ? '#FFFFFF'
    : variant === 'secondary'
      ? T.colors.primary
      : T.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !isDisabled ? buttonStyles.pressed : undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
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
    opacity: 0.8,
  },
  label: {
    fontWeight: T.fontWeight.semiBold,
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
}: AppTextInputProps) {
  const hasError = Boolean(error);

  return (
    <View style={inputStyles.wrapper}>
      {label ? <Text style={inputStyles.label}>{label}</Text> : null}

      <View
        style={[
          inputStyles.container,
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
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
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
    fontSize: T.fontSize.sm,
    fontWeight: T.fontWeight.medium,
    color: T.colors.text,
    marginBottom: T.spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.background,
    height: 48,
    paddingHorizontal: T.spacing.md,
  },
  containerError: {
    borderColor: T.colors.error,
  },
  iconWrapper: {
    marginRight: T.spacing.sm,
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
    borderRadius: T.radius.lg,
    padding: T.spacing.md,
    ...T.shadows.sm,
  },
  pressed: {
    opacity: 0.92,
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
}

export const EmptyState = React.memo(function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
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
  title: {
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
    textAlign: 'center',
    marginBottom: T.spacing.sm,
  },
  subtitle: {
    fontSize: T.fontSize.sm,
    color: T.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: T.spacing.lg,
  },
  actionButton: {
    backgroundColor: T.colors.primary,
    paddingHorizontal: T.spacing.lg,
    paddingVertical: T.spacing.sm + 2,
    borderRadius: T.radius.md,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    fontSize: T.fontSize.sm,
    fontWeight: T.fontWeight.semiBold,
    color: '#FFFFFF',
  },
});
