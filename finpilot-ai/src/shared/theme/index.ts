import { TextStyle, ViewStyle } from 'react-native';

// ============================================================
// Colors
// ============================================================

const colors = {
  primary: '#1490FE',
  primaryDark: '#061D42',
  primaryLight: '#D9E8F5',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#141414',
  textSecondary: '#525252',
  textMuted: '#808080',
  textInverse: '#F5F5F5',
  border: '#CCCCCC',
  borderStrong: '#141414',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  income: '#22C55E',
  expense: '#EF4444',
  incomeLight: '#DCFCE7',
  expenseLight: '#FEE2E2',
  warningLight: '#FEF3C7',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

// ============================================================
// Gradients  (pass directly to LinearGradient colors prop)
// ============================================================

const gradients = {
  primaryCard: ['#061D42', '#1490FE'] as const,
  incomeCard: ['#14532D', '#22C55E'] as const,
  expenseCard: ['#7F1D1D', '#EF4444'] as const,
} as const;

// ============================================================
// Spacing
// ============================================================

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ============================================================
// Border Radius
// ============================================================

const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

// ============================================================
// Typography
// ============================================================

const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semiBold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extraBold: '800' as TextStyle['fontWeight'],
} as const;

// ============================================================
// Shadows
// ============================================================

interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const shadows: Record<'sm' | 'md' | 'lg', Shadow & ViewStyle> = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1490FE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ============================================================
// Theme Export
// ============================================================

export const T = {
  colors,
  gradients,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadows,
} as const;

export type Theme = typeof T;

export default T;
