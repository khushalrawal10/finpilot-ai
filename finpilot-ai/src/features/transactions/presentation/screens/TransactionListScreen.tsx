import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import { useAuthUser } from '@core/di/stores/authStore';

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
      style={({ pressed }) => [
        chipStyles.chip,
        selected ? chipStyles.chipSelected : undefined,
        pressed ? chipStyles.chipPressed : undefined,
      ]}
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: T.colors.background,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: T.colors.primary,
    borderColor: T.colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.colors.textSecondary,
    lineHeight: 18,
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
  const { width } = useWindowDimensions();
  const authUser = useAuthUser();

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

  // Responsive max width for web
  const isWide = width > 600;
  const contentMaxWidth = isWide ? 560 : undefined;
  const profileInitial = (authUser?.displayName || authUser?.email || '?')[0].toUpperCase();

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

  // List header: banner + chips (fixes scroll issue)
  const ListHeader = useMemo(() => (
    <View style={contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined}>
      {/* Summary banner */}
      <LinearGradient
        colors={T.gradients.primaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerTop}>
          <View>
            <Text style={styles.bannerLabel}>Spent this month</Text>
            <Text style={styles.bannerAmount}>{formatAmount(monthlyExpense)}</Text>
          </View>
          <View style={styles.bannerNetContainer}>
            <Text style={styles.bannerNetLabel}>Net</Text>
            <Text style={[
              styles.bannerNetAmount,
              { color: monthlyIncome - monthlyExpense >= 0 ? '#4ADE80' : '#FCA5A5' },
            ]}>
              {monthlyIncome - monthlyExpense >= 0 ? '+' : ''}
              {formatAmount(monthlyIncome - monthlyExpense)}
            </Text>
          </View>
        </View>
        <View style={styles.bannerDivider} />
        <View style={styles.bannerChips}>
          <View style={[styles.bannerChip, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <Ionicons name="trending-up" size={14} color="#4ADE80" />
            <Text style={[styles.bannerChipText, { color: '#4ADE80' }]}>
              {' '}{formatAmount(monthlyIncome)}
            </Text>
          </View>
          <View style={[styles.bannerChip, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
            <Ionicons name="trending-down" size={14} color="#FCA5A5" />
            <Text style={[styles.bannerChipText, { color: '#FCA5A5' }]}>
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
    </View>
  ), [monthlyExpense, monthlyIncome, selectedCategoryId, categories, contentMaxWidth]);

  const topPadding = Platform.OS === 'web' ? 20 : (StatusBar.currentHeight ?? 44);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' as const, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const } : styles.headerInner}>
          <Text style={styles.headerTitle}>Transactions</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed ? styles.addButtonPressed : undefined,
              ]}
              onPress={handleAddPress}
            >
              <Ionicons name="add" size={22} color={T.colors.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.profileButton,
                pressed ? styles.addButtonPressed : undefined,
              ]}
              onPress={() => {
                // Navigate to Settings tab
                const nav = navigation.getParent?.();
                if (nav) nav.navigate('Settings');
              }}
            >
              <Text style={styles.profileInitial}>{profileInitial}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Transaction list with banner as header */}
      {transactions.length === 0 && !isLoading ? (
        <View style={{ flex: 1 }}>
          {ListHeader}
          <EmptyState
            iconName="receipt-outline"
            title="No transactions yet"
            subtitle="Tap the + button to add your first transaction"
            actionLabel="Add Transaction"
            onAction={handleAddPress}
          />
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[
            styles.listContent,
            contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as unknown as number } : undefined,
          ]}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: T.colors.background,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: T.colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -1,
  },
  bannerNetContainer: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  bannerNetLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerNetAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  bannerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14,
  },
  bannerChips: {
    flexDirection: 'row',
    gap: 10,
  },
  bannerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: T.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  bannerChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    paddingVertical: 10,
    backgroundColor: T.colors.background,
    marginTop: 8,
    maxHeight: 54,
  },
  filterContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
});

const listStyles = StyleSheet.create({
  dateHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: T.colors.textMuted,
    paddingLeft: 20,
    paddingTop: 18,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
