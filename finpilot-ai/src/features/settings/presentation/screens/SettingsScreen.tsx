import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import T from '@shared/theme';
import { supabase } from '@core/network/supabase-client';
import { useAuthUser } from '@core/di/stores/authStore';
import useAuthStore from '@core/di/stores/authStore';
import { useAuthActions } from '@features/auth/presentation/hooks/useAuthActions';
import { useToast } from '@shared/components/Toast';

// ============================================================
// SettingsScreen
// ============================================================

export default function SettingsScreen(): React.JSX.Element {
  const user = useAuthUser();
  const { logout } = useAuthActions();
  const { showToast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load profile metadata on mount
  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const meta = authUser.user_metadata ?? {};
        setDisplayName(meta.display_name ?? meta.full_name ?? '');
        setPhone(meta.phone_number ?? authUser.phone ?? '');
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          phone_number: phone.trim(),
        },
      });

      if (error) throw error;

      // Update local auth store
      if (user) {
        setUser({
          ...user,
          displayName: displayName.trim() || null,
        });
      }

      showToast('Profile saved successfully', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [displayName, phone, user, setUser]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // handled by hook
    }
  }, [logout]);

  const initial = (displayName || user?.email || '?')[0].toUpperCase();
  const topPadding = Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 44);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.avatarEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={T.colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.fieldInput, styles.fieldDisabled]}>
              <Text style={styles.fieldDisabledText}>
                {user?.email ?? ''}
              </Text>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={T.colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed ? styles.saveButtonPressed : undefined,
              isSaving ? styles.saveButtonDisabled : undefined,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {saveSuccess ? (
              <View style={styles.saveRow}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}> Saved!</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed ? styles.logoutButtonPressed : undefined,
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={T.colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>FinPilot AI v1.0.0</Text>
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
    backgroundColor: T.colors.surface,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: T.colors.background,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: T.colors.text,
    letterSpacing: -0.5,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: T.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: T.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarEmail: {
    fontSize: 14,
    color: T.colors.textMuted,
  },
  formSection: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: T.colors.background,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.textSecondary,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: T.colors.text,
    backgroundColor: T.colors.background,
  },
  fieldDisabled: {
    backgroundColor: T.colors.surface,
    justifyContent: 'center',
  },
  fieldDisabledText: {
    fontSize: 15,
    color: T.colors.textMuted,
  },
  saveButton: {
    backgroundColor: T.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutSection: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: T.colors.background,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: T.colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: T.colors.textMuted,
    marginTop: 24,
  },
});
