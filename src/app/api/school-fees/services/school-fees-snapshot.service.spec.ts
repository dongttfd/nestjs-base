import type {
  AnnualFeeTemplate,
  FeeTemplate,
} from '@/app/api/school-fees/models/school-fees.model';
import { SchoolFeesSnapshotService } from './school-fees-snapshot.service';

const now = '2026-09-21T00:00:00.000Z';

describe('SchoolFeesSnapshotService', () => {
  const service = new SchoolFeesSnapshotService();

  it('snapshots fixed and daily templates with exact/missing month prices', () => {
    const templates: FeeTemplate[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Vệ sinh',
        type: 'MONTHLY_FIXED',
        active: true,
        applicableChildStatus: null,
        defaultAmount: 12000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Ăn bán trú',
        type: 'DAILY',
        active: true,
        applicableChildStatus: null,
        priceByMonth: {
          '2026-09': 20000,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Dịch vụ',
        type: 'DAILY',
        active: true,
        applicableChildStatus: null,
        priceByMonth: {},
        createdAt: now,
        updatedAt: now,
      },
    ];

    const month = service.buildMonthlyPeriodSnapshot(
      '2026-09',
      templates,
      now,
    );

    expect(month.paymentStatus).toBe('UNPAID');
    expect(month.attendanceDates).toEqual([]);
    expect(month.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MONTHLY_FIXED',
          amount: 12000,
          sourceTemplateId: templates[0].id,
        }),
        expect.objectContaining({
          type: 'DAILY',
          unitPrice: 20000,
          sourceTemplateId: templates[1].id,
        }),
        expect.objectContaining({
          type: 'DAILY',
          unitPrice: null,
          sourceTemplateId: templates[2].id,
        }),
      ]),
    );
  });

  it('rejects annual template in monthly snapshot', () => {
    const annual: AnnualFeeTemplate = {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Bảo hiểm',
      type: 'ANNUAL',
      active: true,
        applicableChildStatus: null,
      defaultAmount: 100000,
      defaultMonthOffset: 0,
      createdAt: now,
      updatedAt: now,
    };

    expect(() =>
      service.buildMonthlyPeriodSnapshot('2026-09', [annual], now),
    ).toThrow('Annual template cannot be used for monthly snapshot.');
  });

  it('uses generated timestamps when timestamp is omitted', () => {
    const fixed: FeeTemplate = {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Nước',
      type: 'MONTHLY_FIXED',
      active: true,
        applicableChildStatus: null,
      defaultAmount: 10000,
      createdAt: now,
      updatedAt: now,
    };
    const monthly = service.buildMonthlyPeriodSnapshot('2026-09', [fixed]);
    expect(monthly.createdAt).toEqual(expect.any(String));
    expect(monthly.updatedAt).toBe(monthly.createdAt);
    expect(monthly.items[0].createdAt).toBe(monthly.createdAt);

    const annual: AnnualFeeTemplate = {
      id: '66666666-6666-4666-8666-666666666666',
      name: 'Đồ dùng học tập',
      type: 'ANNUAL',
      active: true,
        applicableChildStatus: null,
      defaultAmount: 50000,
      defaultMonthOffset: 0,
      createdAt: now,
      updatedAt: now,
    };
    const annualSnapshot = service.buildAnnualSnapshot(annual, '2026-09');
    expect(annualSnapshot.createdAt).toEqual(expect.any(String));
    expect(annualSnapshot.updatedAt).toBe(annualSnapshot.createdAt);
  });

  it('builds annual template snapshot', () => {
    const annual: AnnualFeeTemplate = {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Bảo hiểm',
      type: 'ANNUAL',
      active: true,
        applicableChildStatus: null,
      defaultAmount: 100000,
      defaultMonthOffset: 0,
      createdAt: now,
      updatedAt: now,
    };

    expect(
      service.buildAnnualSnapshot(annual, '2026-10', now),
    ).toMatchObject({
      name: 'Bảo hiểm',
      amount: 100000,
      assignedMonthKey: '2026-10',
      source: 'TEMPLATE',
      sourceTemplateId: annual.id,
    });
  });
});
