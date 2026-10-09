import { Injectable } from '@nestjs/common';
import {
  MonthlyFeeItem,
  MonthlyFeePeriod,
  SchoolYear,
  SchoolYearFeeItem,
} from '@/app/api/school-fees/models/school-fees.model';

export interface CalculatedAnnualItem extends SchoolYearFeeItem {
  calculatedAmount: number;
}

export type CalculatedMonthlyItem = MonthlyFeeItem & {
  calculatedAmount: number;
};

export interface MonthDetailView {
  schoolYearId: string;
  monthKey: string;
  paymentStatus: MonthlyFeePeriod['paymentStatus'];
  attendanceDates: string[];
  attendanceCount: number;
  annualItems: CalculatedAnnualItem[];
  monthlyItems: CalculatedMonthlyItem[];
  totalAmount: number;
  canMarkPaid: boolean;
  blockingReasons: string[];
}

@Injectable()
export class SchoolFeesCalculatorService {
  buildMonthDetail(
    schoolYear: SchoolYear,
    month: MonthlyFeePeriod,
  ): MonthDetailView {
    const attendanceDates = [...new Set(month.attendanceDates)].sort();
    const attendanceCount = attendanceDates.length;
    const annualItems: CalculatedAnnualItem[] = schoolYear.annualFees
      .filter((item) => item.assignedMonthKey === month.monthKey)
      .map((item) => ({
        ...item,
        calculatedAmount: item.amount,
      }));
    const monthlyItems: CalculatedMonthlyItem[] = month.items.map((item) => ({
      ...item,
      calculatedAmount:
        item.type === 'MONTHLY_FIXED'
          ? item.amount
          : attendanceCount * (item.unitPrice ?? 0),
    }));
    const missingDailyPrice = month.items.some(
      (item) => item.type === 'DAILY' && item.unitPrice === null,
    );
    const totalAmount =
      annualItems.reduce((sum, item) => sum + item.calculatedAmount, 0) +
      monthlyItems.reduce((sum, item) => sum + item.calculatedAmount, 0);

    return {
      schoolYearId: schoolYear.id,
      monthKey: month.monthKey,
      paymentStatus: month.paymentStatus,
      attendanceDates,
      attendanceCount,
      annualItems,
      monthlyItems,
      totalAmount,
      canMarkPaid: !missingDailyPrice,
      blockingReasons: missingDailyPrice ? ['DAILY_PRICE_MISSING'] : [],
    };
  }

  calculateMonthTotal(
    schoolYear: SchoolYear,
    month: MonthlyFeePeriod,
  ): number {
    return this.buildMonthDetail(schoolYear, month).totalAmount;
  }
}
