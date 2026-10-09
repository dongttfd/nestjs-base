import {
  MonthlyFeePeriod,
  SchoolYear,
} from '@/app/api/school-fees/models/school-fees.model';
import { SchoolFeesCalculatorService } from './school-fees-calculator.service';

const now = '2026-09-21T00:00:00.000Z';

const buildYear = (month: MonthlyFeePeriod): SchoolYear => ({
  id: '2026-2027',
  startMonthKey: '2026-09',
  endMonthKey: '2027-05',
  annualFees: [
    {
      id: 'annual-1',
      name: 'Đồng phục',
      amount: 250000,
      assignedMonthKey: '2026-09',
      source: 'CUSTOM',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'annual-2',
      name: 'Bảo hiểm',
      amount: 100000,
      assignedMonthKey: '2026-10',
      source: 'CUSTOM',
      createdAt: now,
      updatedAt: now,
    },
  ],
  months: { [month.monthKey]: month },
  createdAt: now,
  updatedAt: now,
});

describe('SchoolFeesCalculatorService', () => {
  const calculator = new SchoolFeesCalculatorService();

  it('calculates zero attendance and accepts zero fixed amount', () => {
    const month: MonthlyFeePeriod = {
      monthKey: '2026-09',
      paymentStatus: 'UNPAID',
      attendanceDates: [],
      items: [
        {
          id: 'fixed-1',
          type: 'MONTHLY_FIXED',
          name: 'Miễn phí',
          amount: 0,
          source: 'CUSTOM',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'daily-1',
          type: 'DAILY',
          name: 'Ăn bán trú',
          unitPrice: 20000,
          source: 'CUSTOM',
          createdAt: now,
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const detail = calculator.buildMonthDetail(buildYear(month), month);

    expect(detail.attendanceCount).toBe(0);
    expect(detail.totalAmount).toBe(250000);
    expect(detail.canMarkPaid).toBe(true);
  });

  it('uses one attendance calendar for multiple daily fees', () => {
    const month: MonthlyFeePeriod = {
      monthKey: '2026-09',
      paymentStatus: 'UNPAID',
      attendanceDates: ['2026-09-01', '2026-09-02', '2026-09-03'],
      items: [
        {
          id: 'daily-1',
          type: 'DAILY',
          name: 'Ăn bán trú',
          unitPrice: 20000,
          source: 'CUSTOM',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'daily-2',
          type: 'DAILY',
          name: 'Dịch vụ theo ngày',
          unitPrice: 5000,
          source: 'CUSTOM',
          createdAt: now,
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const detail = calculator.buildMonthDetail(buildYear(month), month);

    expect(detail.monthlyItems.map((item) => item.calculatedAmount)).toEqual([
      60000,
      15000,
    ]);
    expect(detail.totalAmount).toBe(325000);
  });

  it('treats null daily price as zero and blocks PAID', () => {
    const month: MonthlyFeePeriod = {
      monthKey: '2026-09',
      paymentStatus: 'UNPAID',
      attendanceDates: ['2026-09-01'],
      items: [
        {
          id: 'daily-1',
          type: 'DAILY',
          name: 'Ăn bán trú',
          unitPrice: null,
          source: 'CUSTOM',
          createdAt: now,
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const detail = calculator.buildMonthDetail(buildYear(month), month);

    expect(detail.monthlyItems[0].calculatedAmount).toBe(0);
    expect(detail.canMarkPaid).toBe(false);
    expect(detail.blockingReasons).toContain('DAILY_PRICE_MISSING');
  });

  it('includes annual item only in its assigned month', () => {
    const september: MonthlyFeePeriod = {
      monthKey: '2026-09',
      paymentStatus: 'UNPAID',
      attendanceDates: [],
      items: [],
      createdAt: now,
      updatedAt: now,
    };

    const detail = calculator.buildMonthDetail(buildYear(september), september);

    expect(detail.annualItems.map((item) => item.id)).toEqual(['annual-1']);
    expect(detail.totalAmount).toBe(250000);
  });
});
