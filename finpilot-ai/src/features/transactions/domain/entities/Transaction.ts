// ============================================================
// Transaction Domain Entities & Types
// ============================================================

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  type: 'income' | 'expense';
  amount: number;
  currencyCode: string;
  description: string;
  notes: string | null;
  tags: string[];
  transactionDate: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  page?: number;
  limit?: number;
}

export interface CreateTransactionInput {
  categoryId?: string;
  type: 'income' | 'expense';
  amount: number;
  currencyCode: string;
  description: string;
  notes?: string;
  tags?: string[];
  transactionDate: string;
}
