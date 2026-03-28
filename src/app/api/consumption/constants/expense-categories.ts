import {
  expenseCategoryKeys,
  expenseCategoryMetadata,
  expenseCategoryMetadataByKey,
  expenseOverviewClassifierVersion,
  expenseOverviewPeriods,
  expenseOverviewTaxonomyVersion,
  type ExpenseCategoryMetadata,
  type ExpenseOverviewCategoryKey,
  type ExpenseOverviewPeriod,
} from '@/shared/expense-category-metadata';

export const EXPENSE_OVERVIEW_PERIODS = expenseOverviewPeriods;
export const EXPENSE_OVERVIEW_CATEGORY_KEYS = expenseCategoryKeys;
export const EXPENSE_OVERVIEW_TAXONOMY_VERSION = expenseOverviewTaxonomyVersion;
export const EXPENSE_OVERVIEW_CLASSIFIER_VERSION = expenseOverviewClassifierVersion;

export type { ExpenseOverviewCategoryKey, ExpenseOverviewPeriod };

export type ExpenseCategoryDefinition = ExpenseCategoryMetadata;

export const EXPENSE_CATEGORIES: ExpenseCategoryDefinition[] = expenseCategoryMetadata;
export const EXPENSE_CATEGORIES_BY_KEY = expenseCategoryMetadataByKey;
