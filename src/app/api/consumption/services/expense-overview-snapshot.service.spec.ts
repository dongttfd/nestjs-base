import { PrismaService } from '@/common/services/prisma.service';
import { ExpenseOverviewSnapshotService } from '@/app/api/consumption/services/expense-overview-snapshot.service';
import { resolveExpensePeriodRange } from '@/app/api/consumption/utils/expense-period.util';

const createPrismaServiceMock = () =>
  ({
    expenseOverviewSnapshot: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
  }) as unknown as PrismaService;

describe('ExpenseOverviewSnapshotService', () => {
  let prismaService: PrismaService;
  let service: ExpenseOverviewSnapshotService;

  beforeEach(() => {
    prismaService = createPrismaServiceMock();
    service = new ExpenseOverviewSnapshotService(prismaService);
  });

  it('stores successful snapshots with serialized groups and success status', async () => {
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'deleteMany')
      .mockResolvedValue({ count: 0 } as never);
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'create')
      .mockResolvedValue({} as never);

    const lastSuccessfulRefreshAt = new Date('2026-03-28T01:00:00.000Z');

    await service.saveSuccessfulSnapshot({
      userId: 'user-1',
      period: 'week',
      range: {
        anchorDate: new Date('2026-03-28T00:00:00.000Z'),
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      overview: {
        period: 'week',
        range: {
          start: new Date('2026-03-23T00:00:00.000Z'),
          end: new Date('2026-03-29T23:59:59.999Z'),
        },
        taxonomyVersion: 'expense-taxonomy-canonical-v2',
        classifierVersion: 'expense-classifier-db-title-v2',
        totalAmount: BigInt(45000),
        isEmpty: false,
        isStale: false,
        lastSuccessfulRefreshAt,
        groups: [
          {
            key: 'essential',
            label: 'Tiêu dùng thiết yếu',
            color: '#F59E0B',
            order: 1,
            amount: BigInt(45000),
            percentage: 100,
            transactionCount: 1,
            latestTransactions: [
              {
                id: 'tx-1',
                title: 'Bữa trưa',
                amount: BigInt(45000),
                happenedAt: new Date('2026-03-28T05:30:00.000Z'),
              },
            ],
          },
        ],
      },
    });

    expect((prismaService as any).expenseOverviewSnapshot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          period: 'week',
        }),
      }),
    );
    expect((prismaService as any).expenseOverviewSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshStatus: 'success',
          taxonomyVersion: 'expense-taxonomy-canonical-v2',
          classifierVersion: 'expense-classifier-db-title-v2',
          lastSuccessfulRefreshAt,
          groups: [
            expect.objectContaining({
              key: 'essential',
              amount: 45000,
              latestTransactions: [
                expect.objectContaining({
                  amount: 45000,
                  happenedAt: '2026-03-28T05:30:00.000Z',
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it('reads the latest successful snapshot for the exact range as stale overview', async () => {
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'findFirst')
      .mockResolvedValue({
        id: 'snapshot-1',
        userId: 'user-1',
        period: 'week',
        anchorDate: new Date('2026-03-28T00:00:00.000Z'),
        rangeStart: new Date('2026-03-23T00:00:00.000Z'),
        rangeEnd: new Date('2026-03-29T23:59:59.999Z'),
        totalAmount: BigInt(125000),
        taxonomyVersion: 'expense-taxonomy-canonical-v2',
        classifierVersion: 'expense-classifier-db-title-v2',
        lastSuccessfulRefreshAt: new Date('2026-03-28T01:00:00.000Z'),
        lastAttemptAt: new Date('2026-03-28T01:05:00.000Z'),
        refreshStatus: 'success',
        isEmpty: false,
        groups: [
          {
            key: 'other',
            label: 'Khác',
            color: '#64748B',
            order: 8,
            amount: 125000,
            percentage: 100,
            transactionCount: 1,
            latestTransactions: [
              {
                id: 'tx-1',
                title: 'Chi phí phát sinh',
                amount: 125000,
                happenedAt: '2026-03-28T08:00:00.000Z',
              },
            ],
          },
        ],
        createdAt: new Date('2026-03-28T01:00:00.000Z'),
        updatedAt: new Date('2026-03-28T01:00:00.000Z'),
      } as never);

    const overview = await service.findLatestSuccessfulSnapshot('user-1', 'week', {
      anchorDate: new Date('2026-03-28T00:00:00.000Z'),
      start: new Date('2026-03-23T00:00:00.000Z'),
      end: new Date('2026-03-29T23:59:59.999Z'),
    });

    expect((prismaService as any).expenseOverviewSnapshot.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        period: 'week',
        rangeStart: new Date('2026-03-23T00:00:00.000Z'),
        rangeEnd: new Date('2026-03-29T23:59:59.999Z'),
        taxonomyVersion: 'expense-taxonomy-canonical-v2',
        classifierVersion: 'expense-classifier-db-title-v2',
        lastSuccessfulRefreshAt: { not: null },
      },
      orderBy: [{ lastSuccessfulRefreshAt: 'desc' }, { updatedAt: 'desc' }],
    });
    expect(overview).toMatchObject({
      period: 'week',
      isStale: true,
      totalAmount: BigInt(125000),
      lastSuccessfulRefreshAt: new Date('2026-03-28T01:00:00.000Z'),
    });
    expect(overview?.groups[0]?.latestTransactions[0]?.happenedAt).toBeInstanceOf(Date);
  });

  it('reads the latest successful snapshot for reuse without marking it stale', async () => {
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'findFirst')
      .mockResolvedValue({
        id: 'snapshot-2',
        userId: 'user-1',
        period: 'month',
        anchorDate: new Date('2026-03-28T00:00:00.000Z'),
        rangeStart: new Date('2026-02-28T17:00:00.000Z'),
        rangeEnd: new Date('2026-03-31T16:59:59.999Z'),
        totalAmount: BigInt(300000),
        taxonomyVersion: 'expense-taxonomy-canonical-v2',
        classifierVersion: 'expense-classifier-db-title-v2',
        lastSuccessfulRefreshAt: new Date('2026-03-28T05:00:00.000Z'),
        lastAttemptAt: new Date('2026-03-28T05:00:00.000Z'),
        refreshStatus: 'success',
        isEmpty: false,
        groups: [],
        createdAt: new Date('2026-03-28T05:00:00.000Z'),
        updatedAt: new Date('2026-03-28T05:00:00.000Z'),
      } as never);

    const overview = await service.findReusableSnapshot('user-1', 'month', {
      anchorDate: new Date('2026-03-28T00:00:00.000Z'),
      start: new Date('2026-02-28T17:00:00.000Z'),
      end: new Date('2026-03-31T16:59:59.999Z'),
    });

    expect(overview).toMatchObject({
      period: 'month',
      isStale: false,
      totalAmount: BigInt(300000),
    });
  });

  it('stores stale fallback snapshots while preserving the last successful refresh time', async () => {
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'deleteMany')
      .mockResolvedValue({ count: 0 } as never);
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'create')
      .mockResolvedValue({} as never);

    await service.saveStaleSnapshot({
      userId: 'user-1',
      period: 'week',
      range: {
        anchorDate: new Date('2026-03-28T00:00:00.000Z'),
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      lastAttemptAt: new Date('2026-03-28T02:00:00.000Z'),
      overview: {
        period: 'week',
        range: {
          start: new Date('2026-03-23T00:00:00.000Z'),
          end: new Date('2026-03-29T23:59:59.999Z'),
        },
        taxonomyVersion: 'expense-taxonomy-canonical-v2',
        classifierVersion: 'expense-classifier-db-title-v2',
        totalAmount: BigInt(125000),
        isEmpty: false,
        isStale: true,
        lastSuccessfulRefreshAt: new Date('2026-03-28T01:00:00.000Z'),
        groups: [],
      },
    });

    expect((prismaService as any).expenseOverviewSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshStatus: 'stale',
          lastAttemptAt: new Date('2026-03-28T02:00:00.000Z'),
          lastSuccessfulRefreshAt: new Date('2026-03-28T01:00:00.000Z'),
        }),
      }),
    );
  });

  it('purges snapshots with mismatched taxonomy or classifier version', async () => {
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'deleteMany')
      .mockResolvedValue({ count: 2 } as never);

    await service.purgeLegacySnapshots('user-1');

    expect((prismaService as any).expenseOverviewSnapshot.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [
          { taxonomyVersion: { not: 'expense-taxonomy-canonical-v2' } },
          { classifierVersion: { not: 'expense-classifier-db-title-v2' } },
        ],
      },
    });
  });

  it('invalidates week, month, and year snapshots for each affected consumption date', async () => {
    jest
      .spyOn((prismaService as any).expenseOverviewSnapshot, 'deleteMany')
      .mockResolvedValue({ count: 3 } as never);

    const consumptionDate = new Date('2026-03-31T05:30:00.000Z');
    const weekRange = resolveExpensePeriodRange('week', consumptionDate);
    const monthRange = resolveExpensePeriodRange('month', consumptionDate);
    const yearRange = resolveExpensePeriodRange('year', consumptionDate);

    await service.invalidateSnapshotsByConsumptionDates('user-1', [
      consumptionDate,
      new Date('2026-03-31T05:30:00.000Z'),
    ]);

    expect((prismaService as any).expenseOverviewSnapshot.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [
          {
            period: 'week',
            rangeStart: weekRange.start,
            rangeEnd: weekRange.end,
          },
          {
            period: 'month',
            rangeStart: monthRange.start,
            rangeEnd: monthRange.end,
          },
          {
            period: 'year',
            rangeStart: yearRange.start,
            rangeEnd: yearRange.end,
          },
        ],
      },
    });
  });
});
