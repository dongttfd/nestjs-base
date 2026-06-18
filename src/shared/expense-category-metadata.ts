export const expenseOverviewPeriods = ['week', 'month', 'year'] as const;

export type ExpenseOverviewPeriod = typeof expenseOverviewPeriods[number];

export const expenseCategoryKeys = [
  'essential',
  'transport',
  'housing',
  'health',
  'shopping',
  'entertainment_social',
  'education',
  'family_wife',
  'family_visit',
  'wedding_funeral',
  'other',
] as const;

export type ExpenseOverviewCategoryKey = typeof expenseCategoryKeys[number];

export const expenseOverviewTaxonomyVersion = 'expense-taxonomy-canonical-v2';
export const expenseOverviewClassifierVersion = 'expense-classifier-ai-v1';

export interface ExpenseCategoryMetadata {
  key: ExpenseOverviewCategoryKey;
  label: string;
  translationKey: string;
  color: string;
  order: number;
}

export const expenseCategoryMetadata: ExpenseCategoryMetadata[] = [
  {
    key: 'essential',
    label: 'Tiêu dùng thiết yếu',
    translationKey: 'summary.expense_overview.categories.essential',
    color: '#F59E0B',
    order: 1,
  },
  {
    key: 'transport',
    label: 'Đi lại',
    translationKey: 'summary.expense_overview.categories.transport',
    color: '#0EA5E9',
    order: 2,
  },
  {
    key: 'housing',
    label: 'Tiền nhà',
    translationKey: 'summary.expense_overview.categories.housing',
    color: '#2563EB',
    order: 3,
  },
  {
    key: 'health',
    label: 'Sức khỏe',
    translationKey: 'summary.expense_overview.categories.health',
    color: '#10B981',
    order: 4,
  },
  {
    key: 'shopping',
    label: 'Mua sắm',
    translationKey: 'summary.expense_overview.categories.shopping',
    color: '#EC4899',
    order: 5,
  },
  {
    key: 'entertainment_social',
    label: 'Giải trí / xã hội',
    translationKey:
      'summary.expense_overview.categories.entertainment_social',
    color: '#7C3AED',
    order: 6,
  },
  {
    key: 'education',
    label: 'Giáo dục / phát triển',
    translationKey: 'summary.expense_overview.categories.education',
    color: '#F97316',
    order: 7,
  },
  {
    key: 'family_wife',
    label: 'Đưa vợ chi tiêu',
    translationKey: 'summary.expense_overview.categories.family_wife',
    color: '#E11D48',
    order: 8,
  },
  {
    key: 'family_visit',
    label: 'Thăm thân',
    translationKey: 'summary.expense_overview.categories.family_visit',
    color: '#D946EF',
    order: 9,
  },
  {
    key: 'wedding_funeral',
    label: 'Hiếu hỉ',
    translationKey: 'summary.expense_overview.categories.wedding_funeral',
    color: '#14B8A6',
    order: 10,
  },
  {
    key: 'other',
    label: 'Khác',
    translationKey: 'summary.expense_overview.categories.other',
    color: '#64748B',
    order: 11,
  },
];

export const expenseCategoryMetadataByKey = expenseCategoryMetadata.reduce(
  (result, category) => {
    result[category.key] = category;

    return result;
  },
  {} as Record<ExpenseOverviewCategoryKey, ExpenseCategoryMetadata>,
);
