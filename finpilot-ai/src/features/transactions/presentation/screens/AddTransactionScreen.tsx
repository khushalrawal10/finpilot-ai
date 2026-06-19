import React, { useCallback, useState } from 'react';
import {
  FlatList,
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
import { Ionicons } from '@expo/vector-icons';

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
      if (selectedDate) setTransactionDate(selectedDate);
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
  const accentColor = type === 'expense' ? T.colors.expense : T.colors.income;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Drag handle */}
      <View style={styles.dragHandle} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.headerIcon}>
          <Ionicons name="close" size={24} color={T.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New Transaction</Text>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSaving}
          style={styles.headerSave}
        >
          <Text style={[styles.saveText, isSaving ? styles.saveTextDisabled : undefined]}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type toggle */}
        <View style={styles.typeToggle}>
          <Pressable
            style={[
              styles.typeButton,
              type === 'expense' ? styles.typeExpenseActive : styles.typeExpenseInactive,
            ]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="arrow-up"
              size={16}
              color={type === 'expense' ? '#FFFFFF' : T.colors.expense}
            />
            <Text style={[styles.typeText, { color: type === 'expense' ? '#FFFFFF' : T.colors.expense }]}>
              {' '}Expense
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeButton,
              type === 'income' ? styles.typeIncomeActive : styles.typeIncomeInactive,
            ]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="arrow-down"
              size={16}
              color={type === 'income' ? '#FFFFFF' : T.colors.income}
            />
            <Text style={[styles.typeText, { color: type === 'income' ? '#FFFFFF' : T.colors.income }]}>
              {' '}Income
            </Text>
          </Pressable>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.currencyLabel}>$</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.amountInput, { color: accentColor, borderBottomColor: accentColor }]}
                value={value}
                onChangeText={onChange}
                placeholder="0.00"
                placeholderTextColor={T.colors.border}
                keyboardType="decimal-pad"
              />
            )}
          />
        </View>
        {errors.amount ? (
          <Text style={styles.fieldError}>{errors.amount.message}</Text>
        ) : null}

        {/* Category */}
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(cat) => cat.id}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryList}
          renderItem={({ item: cat }) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Pressable
                style={[
                  styles.categoryChip,
                  isSelected ? styles.categoryChipSelected : undefined,
                ]}
                onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryName, isSelected ? styles.categoryNameSelected : undefined]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          }}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <AppTextInput
              label={`Description${errors.description ? ' *' : ''}`}
              value={value}
              onChangeText={onChange}
              placeholder="What was this for?"
              error={errors.description?.message}
              leftIcon={<Ionicons name="create-outline" size={18} color={T.colors.border} />}
              autoCapitalize="sentences"
            />
          )}
        />

        {/* Date */}
        <Text style={styles.sectionLabel}>DATE</Text>
        <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={T.colors.border} style={styles.dateIcon} />
          <Text style={styles.dateText}>
            {format(transactionDate, 'EEEE, MMM d, yyyy')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={T.colors.border} />
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
              leftIcon={<Ionicons name="document-text-outline" size={18} color={T.colors.border} />}
              autoCapitalize="sentences"
            />
          )}
        />

        {createMutation.isError ? (
          <Text style={styles.fieldError}>
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
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: T.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: T.colors.text,
  },
  headerSave: {
    width: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: T.colors.primary,
  },
  saveTextDisabled: {
    color: T.colors.border,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeExpenseActive: { backgroundColor: T.colors.expense },
  typeExpenseInactive: { backgroundColor: T.colors.expenseLight },
  typeIncomeActive: { backgroundColor: T.colors.income },
  typeIncomeInactive: { backgroundColor: T.colors.incomeLight },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  currencyLabel: {
    fontSize: 28,
    fontWeight: '600',
    color: T.colors.textMuted,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    minWidth: 80,
    textAlign: 'center',
    padding: 0,
    borderBottomWidth: 2,
  },
  fieldError: {
    fontSize: T.fontSize.xs,
    color: T.colors.error,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: T.colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  categoryList: {
    marginBottom: 16,
  },
  categoryScroll: {
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: T.colors.surface,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    backgroundColor: T.colors.primaryLight,
    borderColor: T.colors.primary,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    color: T.colors.text,
  },
  categoryNameSelected: {
    color: T.colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: T.colors.text,
  },
});
