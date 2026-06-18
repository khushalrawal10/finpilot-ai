import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import T from '@shared/theme';
import { AppTextInput } from '@shared/components';
import {
  useCreateTransaction,
  useCategories,
} from '@features/transactions/presentation/hooks/useTransactions';

// ============================================================
// Schema
// ============================================================

const addTransactionSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be greater than zero',
    }),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
});

type AddTransactionFormData = z.infer<typeof addTransactionSchema>;

// ============================================================
// Screen
// ============================================================

export default function AddTransactionScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const createMutation = useCreateTransaction();
  const { categories } = useCategories();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddTransactionFormData>({
    resolver: zodResolver(addTransactionSchema),
    defaultValues: { amount: '', description: '', notes: '' },
  });

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (selectedDate) {
        setTransactionDate(selectedDate);
      }
    },
    [],
  );

  const onSubmit = useCallback(
    async (data: AddTransactionFormData) => {
      await createMutation.mutateAsync({
        type,
        amount: Number(data.amount),
        currencyCode: 'USD',
        description: data.description.trim(),
        notes: data.notes?.trim() || undefined,
        categoryId: selectedCategoryId ?? undefined,
        transactionDate: format(transactionDate, 'yyyy-MM-dd'),
      });
      navigation.goBack();
    },
    [createMutation, type, selectedCategoryId, transactionDate, navigation],
  );

  const isSaving = createMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.headerButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Add Transaction</Text>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSaving}
          style={[styles.headerButton, styles.saveButton]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={T.colors.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <Pressable
            style={[
              styles.typeButton,
              type === 'expense' ? styles.typeExpenseActive : styles.typeInactive,
            ]}
            onPress={() => setType('expense')}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'expense'
                  ? styles.typeTextActive
                  : styles.typeTextInactive,
              ]}
            >
              Expense
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeButton,
              type === 'income' ? styles.typeIncomeActive : styles.typeInactive,
            ]}
            onPress={() => setType('income')}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'income'
                  ? styles.typeTextActive
                  : styles.typeTextInactive,
              ]}
            >
              Income
            </Text>
          </Pressable>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.currencyLabel}>$</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    color:
                      type === 'expense'
                        ? T.colors.expense
                        : T.colors.income,
                  },
                ]}
                value={value}
                onChangeText={onChange}
                placeholder="0.00"
                placeholderTextColor={T.colors.textMuted}
                keyboardType="decimal-pad"
              />
            )}
          />
        </View>
        {errors.amount ? (
          <Text style={styles.errorText}>{errors.amount.message}</Text>
        ) : null}

        {/* Category Picker */}
        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryContainer}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isSelected ? styles.categoryChipSelected : undefined,
                ]}
                onPress={() =>
                  setSelectedCategoryId(isSelected ? null : cat.id)
                }
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryName,
                    isSelected ? styles.categoryNameSelected : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <AppTextInput
              label="Description"
              value={value}
              onChangeText={onChange}
              placeholder="What was this for?"
              error={errors.description?.message}
            />
          )}
        />

        {/* Date Picker */}
        <Text style={styles.sectionLabel}>Date</Text>
        <Pressable
          style={styles.dateRow}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>
            {format(transactionDate, 'EEEE, MMM d, yyyy')}
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={transactionDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Notes */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <AppTextInput
              label="Notes (optional)"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="Add any extra details..."
            />
          )}
        />

        {/* Mutation error */}
        {createMutation.isError ? (
          <Text style={styles.errorText}>
            {createMutation.error?.message ?? 'Failed to save transaction'}
          </Text>
        ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: T.spacing.md,
    paddingTop: T.spacing.xxl,
    paddingBottom: T.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
  },
  headerButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: T.spacing.xs,
  },
  headerTitle: {
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
  },
  closeText: {
    fontSize: T.fontSize.xl,
    color: T.colors.textMuted,
  },
  saveButton: {
    alignItems: 'flex-end',
  },
  saveText: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.primary,
  },
  scrollContent: {
    padding: T.spacing.lg,
    paddingBottom: T.spacing.xxl,
  },

  // Type toggle
  typeToggle: {
    flexDirection: 'row',
    marginBottom: T.spacing.lg,
    gap: T.spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: T.spacing.md,
    borderRadius: T.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeExpenseActive: {
    backgroundColor: T.colors.expense,
  },
  typeIncomeActive: {
    backgroundColor: T.colors.income,
  },
  typeInactive: {
    backgroundColor: T.colors.surface,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  typeButtonText: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.semiBold,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  typeTextInactive: {
    color: T.colors.textMuted,
  },

  // Amount
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: T.spacing.sm,
    paddingVertical: T.spacing.lg,
  },
  currencyLabel: {
    fontSize: T.fontSize.xxxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.textMuted,
    marginRight: T.spacing.xs,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: T.fontWeight.bold,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },

  // Category
  sectionLabel: {
    fontSize: T.fontSize.sm,
    fontWeight: T.fontWeight.medium,
    color: T.colors.text,
    marginBottom: T.spacing.sm,
  },
  categoryContainer: {
    marginBottom: T.spacing.lg,
  },
  categoryScroll: {
    paddingBottom: T.spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm,
    borderRadius: T.radius.full,
    backgroundColor: T.colors.surface,
    marginRight: T.spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    borderColor: T.colors.primary,
    backgroundColor: '#E8F4FD',
  },
  categoryIcon: {
    fontSize: T.fontSize.md,
    marginRight: T.spacing.xs,
  },
  categoryName: {
    fontSize: T.fontSize.sm,
    color: T.colors.text,
    fontWeight: T.fontWeight.medium,
  },
  categoryNameSelected: {
    color: T.colors.primary,
  },

  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.md,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.md,
    marginBottom: T.spacing.lg,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  dateIcon: {
    fontSize: T.fontSize.lg,
    marginRight: T.spacing.sm,
  },
  dateText: {
    fontSize: T.fontSize.md,
    color: T.colors.text,
    fontWeight: T.fontWeight.medium,
  },

  // Errors
  errorText: {
    fontSize: T.fontSize.sm,
    color: T.colors.error,
    textAlign: 'center',
    marginBottom: T.spacing.md,
  },
});
