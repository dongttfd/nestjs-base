import type {
  PaymentStatus,
} from '@/app/api/school-fees/models/school-fees.model';

export interface MonthSummaryData {
  monthKey: string;
  created: boolean;
  paymentStatus?: PaymentStatus;
  attendanceCount?: number;
  totalAmount?: number;
  canMarkPaid?: boolean;
}

export class MonthSummaryEntity implements MonthSummaryData {
  monthKey: string;
  created: boolean;
  paymentStatus?: PaymentStatus;
  attendanceCount?: number;
  totalAmount?: number;
  canMarkPaid?: boolean;

  constructor(summary: MonthSummaryData) {
    Object.assign(this, summary);
  }
}
