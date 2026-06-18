import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import T from '@shared/theme';
import { EmptyState } from '@shared/components';
import {
  useTransactions,
  useCategories,
  useDeleteTransaction,
} from '@features/transactions/presentation/hooks/useTransactions';
import type {
  Transaction,
  TransactionFilters,
} from '@features/transactions/domain/entities/Transaction';

// ============================================================
// Navigation types
// ============================================================

type TransactionsStackParamList = {
  TransactionList: undefined;
  AddTransaction: undefined;
};

type NavProp = StackNavigationProp<TransactionsStackParamList, 'TransactionList'>;

// ============================================================
// TransactionCard
// ============================================================

interface TransactionCardProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

const TransactionCard = React.memo(function TransactionCard({
  transaction,
  onDelete,
}: TransactionCardProps) {
  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? T.colors.expense : T.colors.income;
  const sign = isExpense ? '-' : '+';

  const renderRightActions = useCallback(
    () => (
      <Pressable
        style={cardStyles.deleteAction}
        onPress={() => onDelete(transaction.id)}
      >
        <Text style={cardStyles.deleteText}>Delete</Text>
      </Pressable>
    ),
    [onDelete, transaction.id],
  );

  const handlePress = useCallback(() => {
    // TODO: navigate to transaction detail
    console.log('Transaction tapped:', transaction.id);
  }, [transaction.id]);

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        style={({ pressed }) => [
          cardStyles.container,
          pressed ? cardStyles.pressed : undefined,
        ]}
        onPress={handlePress}
      >
        <View style={cardStyles.leftSection}>
          <View
            style={[
              cardStyles.colorDot,
              {
                backgroundColor:
                  transaction.categoryColor ?? T.colors.textMuted,
              },
            ]}
          />
          <View style={cardStyles.details}>
            <View style={cardStyles.topRow}>
              <Text style={cardStyles.description} numberOfLines={1}>
                {transaction.description}
              </Text>
            </View>
            <View style={cardStyles.bottomRow}>
              <Text style={cardStyles.category} numberOfLines={1}>
                {transaction.categoryName ?? 'Uncategorized'}
              </Text>
              <Text style={cardStyles.date}>
                {transaction.transactionDate}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[cardStyles.amount, { color: amountColor }]}>
          {sign}${transaction.amount.toFixed(2)}
        </Text>
      </Pressable>
    </Swipeable>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.colors.background,
    paddingVertical: T.spacing.md,
    paddingHorizontal: T.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
  },
  pressed: {
    backgroundColor: T.colors.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: T.spacing.md,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: T.radius.full,
    marginRight: T.spacing.md,
  },
  details: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.medium,
    color: T.colors.text,
    flex: 1,
  },
  category: {
    fontSize: T.fontSize.xs,
    color: T.colors.textMuted,
    marginRight: T.spacing.sm,
  },
  date: {
    fontSize: T.fontSize.xs,
    color: T.colors.textMuted,
  },
  amount: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.semiBold,
  },
  deleteAction: {
    backgroundColor: T.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: T.fontSize.sm,
    fontWeight: T.fontWeight.semiBold,
  },
});

// ============================================================
// Filter Chip
// ============================================================

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const FilterChip = React.memo(function FilterChip({
  label,
  selected,
  onPress,
}: FilterChipProps) {
  return (
    <Pressable
      style={[
        chipStyles.chip,
        selected ? chipStyles.chipSelected : undefined,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          chipStyles.chipText,
          selected ? chipStyles.chipTextSelected : undefined,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.xs + 2,
    borderRadius: T.radius.full,
    backgroundColor: T.colors.surface,
    marginRight: T.spacing.sm,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  chipSelected: {
    backgroundColor: T.colors.primary,
    borderColor: T.colors.primary,
  },
  chipText: {
    fontSize: T.fontSize.sm,
    color: T.colors.text,
    fontWeight: T.fontWeight.medium,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});

// ============================================================
// TransactionListScreen
// ============================================================

export default function TransactionListScreen(): React.JSX.Element {
  const navigation = useNavigation<NavProp>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const filters: TransactionFilters = selectedCategoryId
    ? { categoryId: selectedCategoryId }
    : {};

  const { transactions, isLoading, refetch } = useTransactions(filters);
  const { categories } = useCategories();
  const deleteMutation = useDeleteTransaction();

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id });
    },
    [deleteMutation],
  );

  const handleAddPress = useCallback(() => {
    navigation.navigate('AddTransaction');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard transaction={item} onDelete={handleDelete} />
    ),
    [handleDelete],
  );

  const keyExtractor = useCallback(
    (item: Transaction) => item.id,
    [],
  );

  // ----------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------

  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed ? styles.addButtonPressed : undefined,
          ]}
          onPress={handleAddPress}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Category filter chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <FilterChip
            label="All"
            selected={selectedCategoryId === null}
            onPress={() => setSelectedCategoryId(null)}
          />
          {categories.map((cat) => (
            <FilterChip
              key={cat.id}
              label={cat.name}
              selected={selectedCategoryId === cat.id}
              onPress={() =>
                setSelectedCategoryId(
                  selectedCategoryId === cat.id ? null : cat.id,
                )
              }
            />
          ))}
        </ScrollView>
      </View>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          subtitle="Tap the + button to add your first transaction"
          actionLabel="Add Transaction"
          onAction={handleAddPress}
        />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={T.colors.primary}
              colors={[T.colors.primary]}
            />
          }
        />
      )}
    </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: T.spacing.lg,
    paddingTop: T.spacing.xxl,
    paddingBottom: T.spacing.md,
    backgroundColor: T.colors.background,
  },
  headerTitle: {
    fontSize: T.fontSize.xxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: T.radius.full,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    fontSize: T.fontSize.xl,
    fontWeight: T.fontWeight.bold,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  filterContainer: {
    paddingBottom: T.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
  },
  filterContent: {
    paddingHorizontal: T.spacing.lg,
  },
});
