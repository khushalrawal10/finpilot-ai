import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import T from '@shared/theme';
import { supabase } from '@core/network/supabase-client';
import { useAuthUser } from '@core/di/stores/authStore';

// ============================================================
// Types
// ============================================================

interface MonthlySummary {
  total_income: number;
  total_expenses: number;
  net: number;
  transaction_count: number;
}

interface CategoryBreakdown {
  category_name: string;
  category_color: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

// ============================================================
// Hooks
// ============================================================

function useMonthlySummary(year: number, month: number) {
  const user = useAuthUser();

  return useQuery<MonthlySummary, Error>({
    queryKey: ['analytics', 'monthly', year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_summary', {
        p_user_id: user!.id,
        p_year: year,
        p_month: month,
      });

      if (error) throw new Error(error.message);

      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_income: Number(row?.total_income ?? 0),
        total_expenses: Number(row?.total_expense ?? row?.total_expenses ?? 0),
        net: Number(row?.net ?? 0),
        transaction_count: Number(row?.transaction_count ?? 0),
      };
    },
    enabled: user !== null,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

function useCategoryBreakdown(dateFrom: string, dateTo: string) {
  const user = useAuthUser();

  return useQuery<CategoryBreakdown[], Error>({
    queryKey: ['analytics', 'categories', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_category_breakdown', {
        p_user_id: user!.id,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) throw new Error(error.message);

      const rows = (data as Array<Record<string, unknown>>) ?? [];
      const total = rows.reduce(
        (sum, r) => sum + Number(r.total ?? r.total_amount ?? r.s ?? 0),
        0,
      );

      return rows.map((r) => {
        const amount = Number(r.total ?? r.total_amount ?? r.s ?? 0);
        return {
          category_name: String(r.category_name ?? r.cat ?? 'Uncategorized'),
          category_color: String(r.category_color ?? r.col ?? '#6B7280'),
          total_amount: amount,
          transaction_count: Number(r.transaction_count ?? r.n ?? 0),
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      });
    },
    enabled: user !== null,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

// ============================================================
// Helpers
// ============================================================

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ============================================================
// Summary Card
// ============================================================

interface SummaryCardProps {
  label: string;
  amount: number;
  tint: string;
  bg: string;
  iconName: keyof typeof Ionicons.glyphMap;
  prefix?: string;
}

const SummaryCard = React.memo(function SummaryCard({
  label,
  amount,
  tint,
  bg,
  iconName,
  prefix,
}: SummaryCardProps) {
  return (
    <View style={[summaryStyles.card, { backgroundColor: bg }]}>
      <Ionicons name={iconName} size={18} color={tint} />
      <Text style={[summaryStyles.amount, { color: tint }]}>
        {prefix ?? ''}{formatCurrency(amount)}
      </Text>
      <Text style={[summaryStyles.label, { color: tint }]}>{label}</Text>
    </View>
  );
});

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

// ============================================================
// Category Row
// ============================================================

interface CategoryRowProps {
  item: CategoryBreakdown;
}

const CategoryRow = React.memo(function CategoryRow({ item }: CategoryRowProps) {
  return (
    <View style={catStyles.container}>
      <View style={catStyles.topRow}>
        <View style={[catStyles.dot, { backgroundColor: item.category_color }]} />
        <Text style={catStyles.name} numberOfLines={1}>
          {item.category_name}
        </Text>
        <Text style={catStyles.amount}>{formatCurrency(item.total_amount)}</Text>
      </View>
      <Text style={catStyles.percentage}>{item.percentage.toFixed(0)}% of spending</Text>
      <View style={catStyles.progressBg}>
        <View
          style={[
            catStyles.progressFill,
            {
              width: `${Math.min(item.percentage, 100)}%`,
              backgroundColor: item.category_color,
            },
          ]}
        />
      </View>
    </View>
  );
});

const catStyles = StyleSheet.create({
  container: {
    backgroundColor: T.colors.background,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: T.colors.text,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: T.colors.text,
  },
  percentage: {
    fontSize: 12,
    color: T.colors.textMuted,
    marginTop: 2,
    marginLeft: 20,
  },
  progressBg: {
    height: 4,
    backgroundColor: T.colors.surface,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
});

// ============================================================
// Skeleton
// ============================================================

function SummarySkeleton(): React.JSX.Element {
  return (
    <View style={skelStyles.summaryRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={skelStyles.summaryCard} />
      ))}
    </View>
  );
}

function CategorySkeleton(): React.JSX.Element {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={skelStyles.catCard} />
      ))}
    </>
  );
}

const skelStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    height: 90,
    borderRadius: 14,
    backgroundColor: T.colors.surface,
  },
  catCard: {
    height: 88,
    borderRadius: 14,
    backgroundColor: T.colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
  },
});

// ============================================================
// AnalyticsScreen
// ============================================================

export default function AnalyticsScreen(): React.JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);

  const summaryQuery = useMonthlySummary(year, month);
  const categoriesQuery = useCategoryBreakdown(from, to);
  const { data: summary, isLoading: summaryLoading } = summaryQuery;
  const { data: categories, isLoading: categoriesLoading } = categoriesQuery;

  // Refetch when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      summaryQuery.refetch();
      categoriesQuery.refetch();
    }, [summaryQuery.refetch, categoriesQuery.refetch]),
  );

  const handlePrev = useCallback(() => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else { setMonth((m) => m - 1); }
  }, [month]);

  const handleNext = useCallback(() => {
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrent) return;
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else { setMonth((m) => m + 1); }
  }, [month, year, now]);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy');

  const netColor = summary
    ? summary.net >= 0 ? T.colors.primary : T.colors.error
    : T.colors.primary;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      {/* Month selector */}
      <View style={styles.monthSelector}>
        <Pressable onPress={handlePrev} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={20} color={T.colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={handleNext}
          style={[styles.monthArrow, isCurrentMonth ? styles.monthArrowDisabled : undefined]}
          disabled={isCurrentMonth}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isCurrentMonth ? T.colors.border : T.colors.primary}
          />
        </Pressable>
      </View>

      {/* Summary cards */}
      {summaryLoading ? (
        <SummarySkeleton />
      ) : summary ? (
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Income"
            amount={summary.total_income}
            tint="#16A34A"
            bg={T.colors.incomeLight}
            iconName="arrow-down-circle"
            prefix="+"
          />
          <SummaryCard
            label="Expenses"
            amount={summary.total_expenses}
            tint="#DC2626"
            bg={T.colors.expenseLight}
            iconName="arrow-up-circle"
          />
          <SummaryCard
            label="Net"
            amount={summary.net}
            tint={netColor}
            bg={T.colors.primaryLight}
            iconName="wallet-outline"
            prefix={summary.net >= 0 ? '+' : '-'}
          />
        </View>
      ) : null}

      {/* Category section title */}
      <Text style={styles.sectionTitle}>Spending by Category</Text>

      {/* Category rows */}
      {categoriesLoading ? (
        <CategorySkeleton />
      ) : categories && categories.length > 0 ? (
        categories.map((cat) => (
          <CategoryRow key={cat.category_name} item={cat} />
        ))
      ) : (
        <View style={styles.emptyCategories}>
          <Ionicons name="bar-chart-outline" size={36} color={T.colors.border} />
          <Text style={styles.emptyCategoriesText}>No spending data for this month</Text>
        </View>
      )}
    </ScrollView>
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
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
    backgroundColor: T.colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: T.colors.text,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: T.colors.background,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowDisabled: {
    opacity: 0.4,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: T.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCategoriesText: {
    fontSize: 14,
    color: T.colors.textMuted,
    marginTop: 12,
  },
});
