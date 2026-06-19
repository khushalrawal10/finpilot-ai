import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';

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
// Helpers
// ============================================================

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
  const pillBg = isExpense ? T.colors.expenseLight : T.colors.incomeLight;
  const pillText = isExpense ? 'EXP' : 'INC';

  // Category color dot background (20% opacity)
  const dotColor = (transaction.categoryColor ?? T.colors.textMuted) + '33';

  const renderRightActions = useCallback(
    () => (
      <Pressable
        style={cardStyles.deleteAction}
        onPress={() => onDelete(transaction.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      </Pressable>
    ),
    [onDelete, transaction.id],
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={cardStyles.container}>
        {/* Category icon circle */}
        <View style={[cardStyles.iconCircle, { backgroundColor: dotColor }]}>
          <Text style={cardStyles.iconEmoji}>
            {transaction.type === 'income' ? '💰' : '💳'}
          </Text>
        </View>

        {/* Details */}
        <View style={cardStyles.details}>
          <Text style={cardStyles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <View style={cardStyles.meta}>
            <Text style={cardStyles.category}>
              {transaction.categoryName ?? 'Uncategorized'}
            </Text>
            <Text style={cardStyles.dot}>{' · '}</Text>
            <Text style={cardStyles.date}>
              {format(new Date(transaction.transactionDate + 'T12:00:00'), 'MMM d')}
            </Text>
          </View>
        </View>

        {/* Amount + pill */}
        <View style={cardStyles.right}>
          <Text style={[cardStyles.amount, { color: amountColor }]}>
            {sign}{formatAmount(transaction.amount)}
          </Text>
          <View style={[cardStyles.pill, { backgroundColor: pillBg }]}>
            <Text style={[cardStyles.pillText, { color: amountColor }]}>{pillText}</Text>
          </View>
        </View>
      </View>
    </Swipeable>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.background,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: T.colors.text,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    color: T.colors.textMuted,
  },
  dot: {
    fontSize: 12,
    color: T.colors.textMuted,
  },
  date: {
    fontSize: 12,
    color: T.colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  pill: {
    borderRadius: T.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteAction: {
    backgroundColor: T.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 14,
    marginBottom: 8,
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
      style={[chipStyles.chip, selected ? chipStyles.chipSelected : undefined]}
      onPress={onPress}
    >
      <Text style={[chipStyles.chipText, selected ? chipStyles.chipTextSelected : undefined]}>
        {label}
      </Text>
    </Pressable>
  );
});

const chipStyles = StyleSheet.create({
  chip: {
    borderRadius: T.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: T.colors.surface,
  },
  chipSelected: {
    backgroundColor: T.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.textMuted,
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const filters: TransactionFilters = selectedCategoryId
    ? { categoryId: selectedCategoryId }
    : {};

  const { transactions, isLoading, refetch } = useTransactions(filters);
  const { categories } = useCategories();
  const deleteMutation = useDeleteTransaction();

  // Summary banner totals (current month)
  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      const d = new Date(t.transactionDate + 'T12:00:00');
      if (d.getMonth() === month && d.getFullYear() === year) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
    }
    return { monthlyIncome: income, monthlyExpense: expense };
  }, [transactions]);

  const handleDelete = useCallback(
    (id: string) => { deleteMutation.mutate({ id }); },
    [deleteMutation],
  );

  const handleAddPress = useCallback(() => {
    navigation.navigate('AddTransaction');
  }, [navigation]);

  // Build list items with date section headers
  type ListItem =
    | { type: 'header'; date: string; key: string }
    | { type: 'transaction'; data: Transaction; key: string };

  const listData = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    let lastDate = '';
    for (const t of transactions) {
      if (t.transactionDate !== lastDate) {
        lastDate = t.transactionDate;
        items.push({ type: 'header', date: t.transactionDate, key: `hdr-${t.transactionDate}` });
      }
      items.push({ type: 'transaction', data: t, key: t.id });
    }
    return items;
  }, [transactions]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return (
          <Text style={listStyles.dateHeader}>
            {formatDateHeader(item.date)}
          </Text>
        );
      }
      return (
        <TransactionCard
          transaction={item.data}
          onDelete={handleDelete}
        />
      );
    },
    [handleDelete],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

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
          <Ionicons name="add" size={26} color={T.colors.primary} />
        </Pressable>
      </View>

      {/* Summary banner */}
      <LinearGradient
        colors={T.gradients.primaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Text style={styles.bannerLabel}>Spent this month</Text>
        <Text style={styles.bannerAmount}>{formatAmount(monthlyExpense)}</Text>
        <View style={styles.bannerChips}>
          <View style={[styles.bannerChip, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
            <Ionicons name="arrow-down" size={12} color="#22C55E" />
            <Text style={[styles.bannerChipText, { color: '#22C55E' }]}>
              {' '}{formatAmount(monthlyIncome)}
            </Text>
          </View>
          <View style={[styles.bannerChip, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
            <Ionicons name="arrow-up" size={12} color="#EF4444" />
            <Text style={[styles.bannerChipText, { color: '#EF4444' }]}>
              {' '}{formatAmount(monthlyExpense)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={styles.filterRow}
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
              setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)
            }
          />
        ))}
      </ScrollView>

      {/* Transaction list */}
      {transactions.length === 0 && !isLoading ? (
        <EmptyState
          iconName="receipt-outline"
          title="No transactions yet"
          subtitle="Tap the + button to add your first transaction"
          actionLabel="Add Transaction"
          onAction={handleAddPress}
        />
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: T.colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: T.colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  banner: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 20,
  },
  bannerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  bannerAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  bannerChips: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  bannerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: T.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    paddingVertical: 8,
    backgroundColor: T.colors.background,
    marginTop: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
});

const listStyles = StyleSheet.create({
  dateHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: T.colors.textMuted,
    paddingLeft: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
});
