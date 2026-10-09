import type {
  MonthlyFeePeriod,
  SchoolYear,
  SchoolYearFeeItem,
} from '@/app/api/school-fees/models/school-fees.model';

export class SchoolYearEntity {
  id: string;
  startMonthKey: string;
  endMonthKey: string;
  annualFees: SchoolYearFeeItem[];
  months: Record<string, MonthlyFeePeriod>;
  createdAt: string;
  updatedAt: string;

  constructor(year: SchoolYear) {
    this.id = year.id;
    this.startMonthKey = year.startMonthKey;
    this.endMonthKey = year.endMonthKey;
    this.annualFees = structuredClone(year.annualFees);
    this.months = structuredClone(year.months);
    this.createdAt = year.createdAt;
    this.updatedAt = year.updatedAt;
  }
}
