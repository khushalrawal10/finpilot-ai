import { SupabaseClient } from '@supabase/supabase-js';
import {
  Transaction,
  Category,
  TransactionFilters,
  CreateTransactionInput,
} from '@features/transactions/domain/entities/Transaction';
import { DataError, ValidationError } from '@core/types/errors';

// ============================================================
// Internal row types (snake_case from Supabase)
// ============================================================

interface TransactionRow {
  id: string;
  user_id: string;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  type: 'income' | 'expense';
  amount: number;
  currency_code: string;
  description: string;
  notes: string | null;
  tags: string[];
  transaction_date: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  sort_order: number;
}

// ============================================================
// Repository
// ============================================================

export class SupabaseTransactionRepository {
  constructor(private supabase: SupabaseClient) {}

  // ----------------------------------------------------------
  // Get Transactions (with filters)
  // ----------------------------------------------------------

  async getTransactions(
    userId: string,
    filters: TransactionFilters,
  ): Promise<Transaction[]> {
    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    let query = this.supabase
      .from('transactions')
      .select(
        `
        *,
        categories!left (
          name,
          color
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.dateFrom) {
      query = query.gte('transaction_date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('transaction_date', filters.dateTo);
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;

    if (error) {
      throw new DataError(error.message, 'FETCH_TRANSACTIONS_FAILED');
    }

    if (!data) {
      return [];
    }

    return data.map((row: Record<string, unknown>) => {
      const categories = row.categories as {
        name: string;
        color: string;
      } | null;

      return {
        id: row.id as string,
        userId: row.user_id as string,
        categoryId: row.category_id as string | null,
        categoryName: categories?.name ?? null,
        categoryColor: categories?.color ?? null,
        type: row.type as 'income' | 'expense',
        amount: row.amount as number,
        currencyCode: row.currency_code as string,
        description: row.description as string,
        notes: row.notes as string | null,
        tags: (row.tags as string[]) ?? [],
        transactionDate: row.transaction_date as string,
        isDeleted: row.is_deleted as boolean,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };
    });
  }

  // ----------------------------------------------------------
  // Create Transaction
  // ----------------------------------------------------------

  async createTransaction(
    userId: string,
    input: CreateTransactionInput,
  ): Promise<Transaction> {
    if (input.amount <= 0) {
      throw new ValidationError('Amount must be greater than zero', {
        amount: 'Must be a positive number',
      });
    }

    if (!input.description.trim()) {
      throw new ValidationError('Description is required', {
        description: 'Cannot be empty',
      });
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        category_id: input.categoryId ?? null,
        type: input.type,
        amount: input.amount,
        currency_code: input.currencyCode,
        description: input.description.trim(),
        notes: input.notes?.trim() ?? null,
        tags: input.tags ?? [],
        transaction_date: input.transactionDate,
      })
      .select(
        `
        *,
        categories!left (
          name,
          color
        )
      `,
      )
      .single<TransactionRow & { categories: { name: string; color: string } | null }>();

    if (error || !data) {
      throw new DataError(
        error?.message ?? 'Failed to create transaction',
        'CREATE_TRANSACTION_FAILED',
      );
    }

    return this.mapRow(data);
  }

  // ----------------------------------------------------------
  // Update Transaction
  // ----------------------------------------------------------

  async updateTransaction(
    id: string,
    updates: Partial<CreateTransactionInput>,
  ): Promise<Transaction> {
    const updatePayload: Record<string, unknown> = {};

    if (updates.categoryId !== undefined) {
      updatePayload.category_id = updates.categoryId;
    }
    if (updates.type !== undefined) {
      updatePayload.type = updates.type;
    }
    if (updates.amount !== undefined) {
      if (updates.amount <= 0) {
        throw new ValidationError('Amount must be greater than zero', {
          amount: 'Must be a positive number',
        });
      }
      updatePayload.amount = updates.amount;
    }
    if (updates.currencyCode !== undefined) {
      updatePayload.currency_code = updates.currencyCode;
    }
    if (updates.description !== undefined) {
      if (!updates.description.trim()) {
        throw new ValidationError('Description is required', {
          description: 'Cannot be empty',
        });
      }
      updatePayload.description = updates.description.trim();
    }
    if (updates.notes !== undefined) {
      updatePayload.notes = updates.notes?.trim() ?? null;
    }
    if (updates.tags !== undefined) {
      updatePayload.tags = updates.tags;
    }
    if (updates.transactionDate !== undefined) {
      updatePayload.transaction_date = updates.transactionDate;
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', id)
      .select(
        `
        *,
        categories!left (
          name,
          color
        )
      `,
      )
      .single<TransactionRow & { categories: { name: string; color: string } | null }>();

    if (error || !data) {
      throw new DataError(
        error?.message ?? 'Failed to update transaction',
        'UPDATE_TRANSACTION_FAILED',
      );
    }

    return this.mapRow(data);
  }

  // ----------------------------------------------------------
  // Soft Delete Transaction
  // ----------------------------------------------------------

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new DataError(error.message, 'DELETE_TRANSACTION_FAILED');
    }
  }

  // ----------------------------------------------------------
  // Get Categories
  // ----------------------------------------------------------

  async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .or(`is_default.eq.true,user_id.eq.${userId}`)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new DataError(error.message, 'FETCH_CATEGORIES_FAILED');
    }

    if (!data) {
      return [];
    }

    return data.map((row: CategoryRow) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      isDefault: row.is_default,
      sortOrder: row.sort_order,
    }));
  }

  // ----------------------------------------------------------
  // Private row mapper
  // ----------------------------------------------------------

  private mapRow(
    row: TransactionRow & { categories: { name: string; color: string } | null },
  ): Transaction {
    return {
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? null,
      categoryColor: row.categories?.color ?? null,
      type: row.type,
      amount: row.amount,
      currencyCode: row.currency_code,
      description: row.description,
      notes: row.notes,
      tags: row.tags ?? [],
      transactionDate: row.transaction_date,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
