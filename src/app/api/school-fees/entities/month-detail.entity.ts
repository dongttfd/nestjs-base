import { PaymentStatus } from '@/app/api/school-fees/models/school-fees.model';
import {
  CalculatedAnnualItem,
  CalculatedMonthlyItem,
  MonthDetailView,
} from '@/app/api/school-fees/services/school-fees-calculator.service';

export class MonthDetailEntity implements MonthDetailView {
  schoolYearId: string;
  monthKey: string;
  paymentStatus: PaymentStatus;
  attendanceDates: string[];
  attendanceCount: number;
  annualItems: CalculatedAnnualItem[];
  monthlyItems: CalculatedMonthlyItem[];
  totalAmount: number;
  canMarkPaid: boolean;
  blockingReasons: string[];

  constructor(detail: MonthDetailView) {
    this.schoolYearId = detail.schoolYearId;
    this.monthKey = detail.monthKey;
    this.paymentStatus = detail.paymentStatus;
    this.attendanceDates = detail.attendanceDates;
    this.attendanceCount = detail.attendanceCount;
    this.annualItems = detail.annualItems;
    this.monthlyItems = detail.monthlyItems;
    this.totalAmount = detail.totalAmount;
    this.canMarkPaid = detail.canMarkPaid;
    this.blockingReasons = detail.blockingReasons;
  }
}
