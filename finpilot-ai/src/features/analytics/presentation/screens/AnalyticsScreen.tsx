import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

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

      // RPC returns a single row
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_income: Number(row?.total_income ?? 0),
        total_expenses: Number(row?.total_expenses ?? 0),
        net: Number(row?.net ?? 0),
        transaction_count: Number(row?.transaction_count ?? 0),
      };
    },
    enabled: user !== null,
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
        (sum, r) => sum + Number(r.total_amount ?? 0),
        0,
      );

      return rows.map((r) => ({
        category_name: String(r.category_name ?? 'Uncategorized'),
        category_color: String(r.category_color ?? '#6B7280'),
        total_amount: Number(r.total_amount ?? 0),
        transaction_count: Number(r.transaction_count ?? 0),
        percentage: total > 0 ? (Number(r.total_amount ?? 0) / total) * 100 : 0,
      }));
    },
    enabled: user !== null,
  });
}

// ============================================================
// Helpers
// ============================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
// Skeleton Components
// ============================================================

function SummarySkeleton(): React.JSX.Element {
  return (
    <View style={styles.summaryRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.summaryCard, styles.skeletonCard]}>
          <View style={styles.skeletonAmount} />
          <View style={styles.skeletonLabel} />
        </View>
      ))}
    </View>
  );
}

function CategorySkeleton(): React.JSX.Element {
  return (
    <View>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.categoryRow}>
          <View style={styles.skeletonDot} />
          <View style={styles.skeletonCatName} />
          <View style={styles.skeletonCatAmount} />
        </View>
      ))}
    </View>
  );
}

// ============================================================
// Summary Card
// ============================================================

interface SummaryCardProps {
  label: string;
  amount: number;
  tint: string;
  prefix?: string;
}

const SummaryCard = React.memo(function SummaryCard({
  label,
  amount,
  tint,
  prefix,
}: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: tint + '12' }]}>
      <Text style={[styles.summaryAmount, { color: tint }]}>
        {prefix ?? ''}{formatCurrency(amount)}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
});

// ============================================================
// Category Row
// ============================================================

interface CategoryRowProps {
  item: CategoryBreakdown;
}

const CategoryRow = React.memo(function CategoryRow({
  item,
}: CategoryRowProps) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryInfo}>
        <View
          style={[styles.categoryDot, { backgroundColor: item.category_color }]}
        />
        <Text style={styles.categoryName} numberOfLines={1}>
          {item.category_name}
        </Text>
      </View>

      <View style={styles.categoryRight}>
        <Text style={styles.categoryAmount}>
          ${item.total_amount.toFixed(2)}
        </Text>
        <Text style={styles.categoryCount}>
          {item.transaction_count} txn{item.transaction_count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
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

// ============================================================
// Analytics Screen
// ============================================================

export default function AnalyticsScreen(): React.JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useMonthlySummary(year, month);

  const {
    data: categories,
    isLoading: categoriesLoading,
  } = useCategoryBreakdown(from, to);

  // ----------------------------------------------------------
  // Month navigation
  // ----------------------------------------------------------

  const handlePrev = useCallback(() => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const handleNext = useCallback(() => {
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return; // Don't go into the future

    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month, year, now]);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.headerTitle}>Analytics</Text>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <Pressable onPress={handlePrev} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>‹</Text>
        </Pressable>

        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>

        <Pressable
          onPress={handleNext}
          style={[
            styles.monthArrow,
            isCurrentMonth ? styles.monthArrowDisabled : undefined,
          ]}
          disabled={isCurrentMonth}
        >
          <Text
            style={[
              styles.monthArrowText,
              isCurrentMonth ? styles.monthArrowTextDisabled : undefined,
            ]}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {/* Summary Cards */}
      {summaryLoading ? (
        <SummarySkeleton />
      ) : summary ? (
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Income"
            amount={summary.total_income}
            tint={T.colors.income}
            prefix="+"
          />
          <SummaryCard
            label="Expenses"
            amount={summary.total_expenses}
            tint={T.colors.expense}
          />
          <SummaryCard
            label="Net"
            amount={summary.net}
            tint={T.colors.primary}
            prefix={summary.net >= 0 ? '+' : '-'}
          />
        </View>
      ) : null}

      {/* Transaction count */}
      {summary && !summaryLoading ? (
        <Text style={styles.txnCount}>
          {summary.transaction_count} transaction
          {summary.transaction_count !== 1 ? 's' : ''} this month
        </Text>
      ) : null}

      {/* Category Breakdown */}
      <Text style={styles.sectionTitle}>Spending by Category</Text>

      {categoriesLoading ? (
        <CategorySkeleton />
      ) : categories && categories.length > 0 ? (
        <View style={styles.categoryList}>
          {categories.map((cat) => (
            <CategoryRow key={cat.category_name} item={cat} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCategories}>
          <Text style={styles.emptyCategoriesText}>
            No spending data for this month
          </Text>
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
    backgroundColor: T.colors.background,
  },
  content: {
    paddingHorizontal: T.spacing.lg,
    paddingTop: T.spacing.xxl,
    paddingBottom: T.spacing.xxl,
  },
  headerTitle: {
    fontSize: T.fontSize.xxl,
    fontWeight: T.fontWeight.bold,
    color: T.colors.text,
    marginBottom: T.spacing.lg,
  },

  // Month selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: T.spacing.lg,
  },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: T.radius.full,
    backgroundColor: T.colors.surface,
  },
  monthArrowDisabled: {
    opacity: 0.3,
  },
  monthArrowText: {
    fontSize: 28,
    color: T.colors.primary,
    lineHeight: 32,
  },
  monthArrowTextDisabled: {
    color: T.colors.textMuted,
  },
  monthLabel: {
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
    marginHorizontal: T.spacing.lg,
    minWidth: 160,
    textAlign: 'center',
  },

  // Summary cards
  summaryRow: {
    flexDirection: 'row',
    gap: T.spacing.sm,
    marginBottom: T.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: T.radius.md,
    paddingVertical: T.spacing.md,
    paddingHorizontal: T.spacing.sm,
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.bold,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: T.fontSize.xs,
    color: T.colors.textMuted,
    fontWeight: T.fontWeight.medium,
  },
  txnCount: {
    fontSize: T.fontSize.sm,
    color: T.colors.textMuted,
    textAlign: 'center',
    marginBottom: T.spacing.xl,
  },

  // Category section
  sectionTitle: {
    fontSize: T.fontSize.lg,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
    marginBottom: T.spacing.md,
  },
  categoryList: {
    gap: T.spacing.md,
  },
  categoryRow: {
    marginBottom: T.spacing.xs,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: T.radius.full,
    marginRight: T.spacing.sm,
  },
  categoryName: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.medium,
    color: T.colors.text,
    flex: 1,
  },
  categoryRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: T.fontSize.md,
    fontWeight: T.fontWeight.semiBold,
    color: T.colors.text,
  },
  categoryCount: {
    fontSize: T.fontSize.xs,
    color: T.colors.textMuted,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.full,
    marginTop: T.spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: T.radius.full,
  },
  emptyCategories: {
    paddingVertical: T.spacing.xl,
    alignItems: 'center',
  },
  emptyCategoriesText: {
    fontSize: T.fontSize.md,
    color: T.colors.textMuted,
  },

  // Skeletons
  skeletonCard: {
    backgroundColor: '#F0F0F0',
  },
  skeletonAmount: {
    width: 60,
    height: 20,
    backgroundColor: '#E5E5E5',
    borderRadius: T.radius.sm,
    marginBottom: 6,
  },
  skeletonLabel: {
    width: 40,
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: T.radius.sm,
  },
  skeletonDot: {
    width: 10,
    height: 10,
    borderRadius: T.radius.full,
    backgroundColor: '#E5E5E5',
    marginRight: T.spacing.sm,
  },
  skeletonCatName: {
    width: 100,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: T.radius.sm,
    flex: 1,
  },
  skeletonCatAmount: {
    width: 60,
    height: 14,
    backgroundColor: '#E5E5E5',
    borderRadius: T.radius.sm,
    marginLeft: T.spacing.md,
  },
});
