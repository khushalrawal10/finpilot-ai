import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { supabase } from '@core/network/supabase-client';
import { useAuthUser } from '@core/di/stores/authStore';
import { SupabaseTransactionRepository } from '@features/transactions/data/repositories/SupabaseTransactionRepository';
import {
  Transaction,
  Category,
  TransactionFilters,
  CreateTransactionInput,
} from '@features/transactions/domain/entities/Transaction';

// ============================================================
// Repository instance
// ============================================================

const txnRepo = new SupabaseTransactionRepository(supabase);

// ============================================================
// Query Keys
// ============================================================

const QUERY_KEYS = {
  transactions: (filters: TransactionFilters) => ['transactions', filters] as const,
  categories: ['categories'] as const,
};

// ============================================================
// useTransactions
// ============================================================

export function useTransactions(filters: TransactionFilters) {
  const user = useAuthUser();

  const query = useQuery<Transaction[], Error>({
    queryKey: QUERY_KEYS.transactions(filters),
    queryFn: () => {
      if (!user) {
        return Promise.resolve([]);
      }
      return txnRepo.getTransactions(user.id, filters);
    },
    enabled: user !== null,
    staleTime: 60_000,
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================
// useCategories
// ============================================================

export function useCategories() {
  const user = useAuthUser();

  const query = useQuery<Category[], Error>({
    queryKey: QUERY_KEYS.categories,
    queryFn: () => {
      if (!user) {
        return Promise.resolve([]);
      }
      return txnRepo.getCategories(user.id);
    },
    enabled: user !== null,
    staleTime: 300_000,
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ============================================================
// Embed Trigger (fire-and-forget)
// ============================================================

async function triggerEmbed(transactionId: string, userId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ transactionId, userId }),
    });
  } catch {
    /* silent fail — embedding is non-critical */
  }
}

// ============================================================
// useCreateTransaction
// ============================================================

export function useCreateTransaction() {
  const user = useAuthUser();
  const queryClient = useQueryClient();

  return useMutation<Transaction, Error, CreateTransactionInput>({
    mutationFn: (input: CreateTransactionInput) => {
      if (!user) {
        return Promise.reject(new Error('Not authenticated'));
      }
      return txnRepo.createTransaction(user.id, input);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });

      // Fire-and-forget: generate embedding for the new transaction
      if (user) {
        void triggerEmbed(data.id, user.id);
      }
    },
  });
}

// ============================================================
// useUpdateTransaction
// ============================================================

interface UpdateTransactionVars {
  id: string;
  updates: Partial<CreateTransactionInput>;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation<Transaction, Error, UpdateTransactionVars>({
    mutationFn: ({ id, updates }: UpdateTransactionVars) =>
      txnRepo.updateTransaction(id, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// ============================================================
// useDeleteTransaction
// ============================================================

interface DeleteTransactionVars {
  id: string;
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteTransactionVars>({
    mutationFn: ({ id }: DeleteTransactionVars) =>
      txnRepo.deleteTransaction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
