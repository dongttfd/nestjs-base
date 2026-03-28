import {
  endOfISOWeek,
  endOfMonth,
  endOfYear,
  startOfISOWeek,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { ExpenseOverviewPeriod } from '@/app/api/consumption/constants/expense-categories';

export interface ExpenseOverviewPeriodRange {
  anchorDate: Date;
  start: Date;
  end: Date;
}

const ensureValidAnchorDate = (anchorDate?: Date) => {
  const resolvedAnchorDate = anchorDate ? new Date(anchorDate) : new Date();

  if (Number.isNaN(resolvedAnchorDate.getTime())) {
    return new Date();
  }

  return resolvedAnchorDate;
};

export const resolveExpensePeriodRange = (
  period: ExpenseOverviewPeriod,
  anchorDate?: Date,
): ExpenseOverviewPeriodRange => {
  const resolvedAnchorDate = ensureValidAnchorDate(anchorDate);

  if (period === 'week') {
    return {
      anchorDate: resolvedAnchorDate,
      start: startOfISOWeek(resolvedAnchorDate),
      end: endOfISOWeek(resolvedAnchorDate),
    };
  }

  if (period === 'month') {
    return {
      anchorDate: resolvedAnchorDate,
      start: startOfMonth(resolvedAnchorDate),
      end: endOfMonth(resolvedAnchorDate),
    };
  }

  return {
    anchorDate: resolvedAnchorDate,
    start: startOfYear(resolvedAnchorDate),
    end: endOfYear(resolvedAnchorDate),
  };
};
