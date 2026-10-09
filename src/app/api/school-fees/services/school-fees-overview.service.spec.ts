import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { SchoolFeesDataFile } from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesCalculatorService } from './school-fees-calculator.service';
import { SchoolFeesOverviewService } from './school-fees-overview.service';

const childId = '550e8400-e29b-41d4-a716-446655440000';
const now = '2026-09-21T00:00:00.000Z';

const buildData = (): SchoolFeesDataFile => ({
  schemaVersion: 1,
  childId,
  status: 'NEW',
  defaultsSeedVersion: 2,
  templates: [],
  schoolYears: [
    {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2026-11',
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
      months: {
        '2026-09': {
          monthKey: '2026-09',
          paymentStatus: 'PAID',
          attendanceDates: ['2026-09-01', '2026-09-02'],
          items: [
            {
              id: 'fixed-1',
              type: 'MONTHLY_FIXED',
              name: 'Vệ sinh',
              amount: 12000,
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
        },
        '2026-10': {
          monthKey: '2026-10',
          paymentStatus: 'UNPAID',
          attendanceDates: ['2026-10-01'],
          items: [
            {
              id: 'fixed-2',
              type: 'MONTHLY_FIXED',
              name: 'Vệ sinh',
              amount: 12000,
              source: 'CUSTOM',
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'daily-2',
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
        },
      },
      createdAt: now,
      updatedAt: now,
    },
  ],
});

describe('SchoolFeesOverviewService', () => {
  let service: SchoolFeesOverviewService;
  let repository: jest.Mocked<Pick<JsonSchoolFeesRepository, 'readChild'>>;

  beforeEach(() => {
    const data = buildData();
    repository = {
      readChild: jest.fn(async (requestedChildId: string) => {
        expect(requestedChildId).toBe(childId);

        return structuredClone(data);
      }),
    };
    service = new SchoolFeesOverviewService(
      repository as unknown as JsonSchoolFeesRepository,
      new SchoolFeesCalculatorService(),
    );
  });

  it('builds annual total, created/uncreated summaries and year total without double-counting annual items', async () => {
    const overview = await service.getOverview(childId, '2026-2027');

    expect(overview.annualTotalAmount).toBe(350000);
    expect(overview.months).toHaveLength(3);
    expect(overview.months[0]).toEqual(
      expect.objectContaining({
        monthKey: '2026-09',
        created: true,
        paymentStatus: 'PAID',
        attendanceCount: 2,
        totalAmount: 302000,
        canMarkPaid: true,
      }),
    );
    expect(overview.months[1]).toEqual(
      expect.objectContaining({
        monthKey: '2026-10',
        created: true,
        paymentStatus: 'UNPAID',
        attendanceCount: 1,
        totalAmount: 112000,
        canMarkPaid: false,
      }),
    );
    expect(overview.months[2]).toEqual({
      monthKey: '2026-11',
      created: false,
    });

    // 350k annual once + Sep monthly-only 52k + Oct monthly-only 12k.
    expect(overview.totalAmount).toBe(414000);
  });

  it('lists school years and rejects missing detail', async () => {
    const list = await service.listOverviews(childId);

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('2026-2027');

    await expect(
      service.getOverview(childId, '2025-2026'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects malformed/non-consecutive school year id before repository read', async () => {
    await expect(
      service.getOverview(childId, 'bad'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getOverview(childId, '2026-2028'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sorts multiple overviews newest first and enumerates across year boundary', async () => {
    const original = await repository.readChild(childId);
    original.schoolYears.push({
      id: '2027-2028',
      startMonthKey: '2027-12',
      endMonthKey: '2028-01',
      annualFees: [],
      months: {},
      createdAt: now,
      updatedAt: now,
    });
    repository.readChild.mockResolvedValue(structuredClone(original));

    const list = await service.listOverviews(childId);

    expect(list.map((item) => item.id)).toEqual(['2027-2028', '2026-2027']);
    expect(list[0].months).toEqual([
      { monthKey: '2027-12', created: false },
      { monthKey: '2028-01', created: false },
    ]);
  });

  it('maps repository errors and preserves unexpected errors', async () => {
    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('INVALID_CHILD_ID', 'invalid'),
    );
    await expect(service.listOverviews(childId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('CHILD_NOT_FOUND', 'missing'),
    );
    await expect(service.listOverviews(childId)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('SCHOOL_FEES_DATA_READ_FAILED', 'broken'),
    );
    await expect(service.listOverviews(childId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    repository.readChild.mockRejectedValueOnce(new Error('unexpected'));
    await expect(service.listOverviews(childId)).rejects.toThrow('unexpected');
  });

});
