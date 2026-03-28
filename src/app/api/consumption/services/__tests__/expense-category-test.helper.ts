import {
  EXPENSE_CATEGORIES_BY_KEY,
  ExpenseOverviewCategoryKey,
} from '@/app/api/consumption/constants/expense-categories';
import { ExpenseCategorySummary } from '@/app/api/consumption/entities/expense-category-summary.entity';

export const createExpenseCategorySummaryFixture = (
  key: ExpenseOverviewCategoryKey,
  overrides: Partial<ExpenseCategorySummary> = {},
): ExpenseCategorySummary => {
  const metadata = EXPENSE_CATEGORIES_BY_KEY[key];

  return {
    key,
    label: metadata.label,
    color: metadata.color,
    order: metadata.order,
    amount: BigInt(0),
    percentage: 0,
    transactionCount: 0,
    latestTransactions: [],
    ...overrides,
  };
};
