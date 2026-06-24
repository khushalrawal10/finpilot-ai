import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================
// Types
// ============================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ============================================================
// Context
// ============================================================

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = (): ToastContextValue => useContext(ToastContext);

// ============================================================
// Toast Item (animated)
// ============================================================

const TOAST_DURATION = 2800;

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

const COLOR_MAP: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: '#ECFDF5', text: '#065F46', icon: '#10B981' },
  error:   { bg: '#FEF2F2', text: '#991B1B', icon: '#EF4444' },
  info:    { bg: '#EFF6FF', text: '#1E40AF', icon: '#3B82F6' },
  warning: { bg: '#FFFBEB', text: '#92400E', icon: '#F59E0B' },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss(toast.id));
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const colors = COLOR_MAP[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.bg, transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons name={ICON_MAP[toast.type]} size={20} color={colors.icon} />
      <Text style={[styles.toastText, { color: colors.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <Pressable onPress={() => onDismiss(toast.id)} hitSlop={8}>
        <Ionicons name="close" size={16} color={colors.text} />
      </Pressable>
    </Animated.View>
  );
}

// ============================================================
// Provider
// ============================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]); // max 3 visible
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const topInset = Platform.OS === 'web' ? 12 : (StatusBar.currentHeight ?? 48) + 8;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { top: topInset }]} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    gap: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
