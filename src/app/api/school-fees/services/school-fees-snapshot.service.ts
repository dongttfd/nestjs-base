import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AnnualFeeTemplate,
  FeeTemplate,
  MonthlyFeeItem,
  MonthlyFeePeriod,
  SchoolYearFeeItem,
} from '@/app/api/school-fees/models/school-fees.model';

@Injectable()
export class SchoolFeesSnapshotService {
  buildMonthlyPeriodSnapshot(
    monthKey: string,
    templates: FeeTemplate[],
    timestamp = new Date().toISOString(),
  ): MonthlyFeePeriod {
    const items: MonthlyFeeItem[] = templates.map((template) => {
      const common = {
        id: randomUUID(),
        name: template.name,
        source: 'TEMPLATE' as const,
        sourceTemplateId: template.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      if (template.type === 'MONTHLY_FIXED') {
        return {
          ...common,
          type: 'MONTHLY_FIXED' as const,
          amount: template.defaultAmount,
        };
      }

      if (template.type === 'DAILY') {
        return {
          ...common,
          type: 'DAILY' as const,
          unitPrice: Object.prototype.hasOwnProperty.call(
            template.priceByMonth,
            monthKey,
          )
            ? template.priceByMonth[monthKey]
            : null,
        };
      }

      throw new Error('Annual template cannot be used for monthly snapshot.');
    });

    return {
      monthKey,
      paymentStatus: 'UNPAID',
      attendanceDates: [],
      items,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  buildAnnualSnapshot(
    template: AnnualFeeTemplate,
    assignedMonthKey: string,
    timestamp = new Date().toISOString(),
  ): SchoolYearFeeItem {
    return {
      id: randomUUID(),
      name: template.name,
      amount: template.defaultAmount,
      assignedMonthKey,
      source: 'TEMPLATE',
      sourceTemplateId: template.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }
}
