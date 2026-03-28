import { Consumption } from '@prisma/client';
import { PrismaService } from '@/common/services/prisma.service';
import { ExpenseClassifierService } from '@/app/api/consumption/services/expense-classifier.service';
import { ExpenseOverviewAggregateService } from '@/app/api/consumption/services/expense-overview-aggregate.service';
import { ExpenseOverviewSnapshotService } from '@/app/api/consumption/services/expense-overview-snapshot.service';

const createPrismaServiceMock = () => ({
  consumption: {
    findMany: jest.fn(),
  },
}) as unknown as PrismaService;

const createSnapshotServiceMock = () => ({
  saveSuccessfulSnapshot: jest.fn(),
  findLatestSuccessfulSnapshot: jest.fn(),
  findReusableSnapshot: jest.fn(),
  saveStaleSnapshot: jest.fn(),
  purgeLegacySnapshots: jest.fn(),
}) as unknown as ExpenseOverviewSnapshotService;

describe('ExpenseOverviewAggregateService', () => {
  let prismaService: PrismaService;
  let snapshotService: ExpenseOverviewSnapshotService;
  let service: ExpenseOverviewAggregateService;

  beforeEach(() => {
    prismaService = createPrismaServiceMock();
    snapshotService = createSnapshotServiceMock();
    service = new ExpenseOverviewAggregateService(
      prismaService,
      new ExpenseClassifierService(),
      snapshotService,
    );
  });

  it('sorts transaction previews by amount descending, breaks ties by newer date, and limits the list to ten records', () => {
    const consumptions = [
      {
        id: 'tx-1',
        userId: 'user-1',
        title: 'Giao dịch 1',
        amount: BigInt(12000),
        date: new Date('2026-03-17T08:00:00.000Z'),
        createdAt: new Date('2026-03-17T09:00:00.000Z'),
        updatedAt: new Date('2026-03-17T09:00:00.000Z'),
      },
      {
        id: 'tx-2',
        userId: 'user-1',
        title: 'Giao dịch 2',
        amount: BigInt(11000),
        date: new Date('2026-03-18T08:00:00.000Z'),
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
        updatedAt: new Date('2026-03-18T09:00:00.000Z'),
      },
      {
        id: 'tx-3',
        userId: 'user-1',
        title: 'Giao dịch 3',
        amount: BigInt(10000),
        date: new Date('2026-03-20T08:00:00.000Z'),
        createdAt: new Date('2026-03-20T09:00:00.000Z'),
        updatedAt: new Date('2026-03-20T09:00:00.000Z'),
      },
      {
        id: 'tx-4',
        userId: 'user-1',
        title: 'Giao dịch 4',
        amount: BigInt(10000),
        date: new Date('2026-03-19T08:00:00.000Z'),
        createdAt: new Date('2026-03-19T09:00:00.000Z'),
        updatedAt: new Date('2026-03-19T09:00:00.000Z'),
      },
      {
        id: 'tx-5',
        userId: 'user-1',
        title: 'Giao dịch 5',
        amount: BigInt(9000),
        date: new Date('2026-03-21T08:00:00.000Z'),
        createdAt: new Date('2026-03-21T09:00:00.000Z'),
        updatedAt: new Date('2026-03-21T09:00:00.000Z'),
      },
      {
        id: 'tx-6',
        userId: 'user-1',
        title: 'Giao dịch 6',
        amount: BigInt(8000),
        date: new Date('2026-03-22T08:00:00.000Z'),
        createdAt: new Date('2026-03-22T09:00:00.000Z'),
        updatedAt: new Date('2026-03-22T09:00:00.000Z'),
      },
      {
        id: 'tx-7',
        userId: 'user-1',
        title: 'Giao dịch 7',
        amount: BigInt(7000),
        date: new Date('2026-03-23T08:00:00.000Z'),
        createdAt: new Date('2026-03-23T09:00:00.000Z'),
        updatedAt: new Date('2026-03-23T09:00:00.000Z'),
      },
      {
        id: 'tx-8',
        userId: 'user-1',
        title: 'Giao dịch 8',
        amount: BigInt(6000),
        date: new Date('2026-03-24T08:00:00.000Z'),
        createdAt: new Date('2026-03-24T09:00:00.000Z'),
        updatedAt: new Date('2026-03-24T09:00:00.000Z'),
      },
      {
        id: 'tx-9',
        userId: 'user-1',
        title: 'Giao dịch 9',
        amount: BigInt(5000),
        date: new Date('2026-03-25T08:00:00.000Z'),
        createdAt: new Date('2026-03-25T09:00:00.000Z'),
        updatedAt: new Date('2026-03-25T09:00:00.000Z'),
      },
      {
        id: 'tx-10',
        userId: 'user-1',
        title: 'Giao dịch 10',
        amount: BigInt(4000),
        date: new Date('2026-03-26T08:00:00.000Z'),
        createdAt: new Date('2026-03-26T09:00:00.000Z'),
        updatedAt: new Date('2026-03-26T09:00:00.000Z'),
      },
      {
        id: 'tx-11',
        userId: 'user-1',
        title: 'Giao dịch 11',
        amount: BigInt(3000),
        date: new Date('2026-03-27T08:00:00.000Z'),
        createdAt: new Date('2026-03-27T09:00:00.000Z'),
        updatedAt: new Date('2026-03-27T09:00:00.000Z'),
      },
      {
        id: 'tx-12',
        userId: 'user-1',
        title: 'Giao dịch 12',
        amount: BigInt(2000),
        date: new Date('2026-03-28T08:00:00.000Z'),
        createdAt: new Date('2026-03-28T09:00:00.000Z'),
        updatedAt: new Date('2026-03-28T09:00:00.000Z'),
      },
    ] as Consumption[];

    const overview = service.buildOverview(
      'week',
      {
        anchorDate: new Date('2026-03-28T00:00:00.000Z'),
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      consumptions,
      false,
      new Date('2026-03-28T01:00:00.000Z'),
    );

    expect(overview.groups).toHaveLength(1);
    expect(overview.groups[0]?.key).toBe('other');
    expect(overview.groups[0]?.order).toBe(8);
    expect(overview.groups[0]?.latestTransactions).toHaveLength(10);
    expect(overview.groups[0]?.latestTransactions.map((transaction) => transaction.id)).toEqual([
      'tx-1',
      'tx-2',
      'tx-3',
      'tx-4',
      'tx-5',
      'tx-6',
      'tx-7',
      'tx-8',
      'tx-9',
      'tx-10',
    ]);
    expect(overview.groups[0]?.latestTransactions[2]?.amount).toBe(BigInt(10000));
    expect(overview.groups[0]?.latestTransactions[3]?.amount).toBe(BigInt(10000));
  });

  it('returns empty state when no consumption exists in the selected period', async () => {
    jest
      .spyOn(snapshotService, 'findReusableSnapshot')
      .mockResolvedValue(null as never);
    jest.spyOn(prismaService.consumption, 'findMany').mockResolvedValue([]);
    jest
      .spyOn(snapshotService, 'saveSuccessfulSnapshot')
      .mockResolvedValue({} as never);

    const overview = await service.getExpenseOverview('user-1', {
      period: 'week',
      anchorDate: new Date('2026-03-28T00:00:00.000Z'),
    });

    expect(overview.isEmpty).toBe(true);
    expect(overview.isStale).toBe(false);
    expect(overview.totalAmount).toBe(BigInt(0));
    expect(overview.taxonomyVersion).toBe('expense-taxonomy-canonical-v2');
    expect(overview.classifierVersion).toBe('expense-classifier-db-title-v2');
    expect(overview.groups).toEqual([]);
    expect(overview.lastSuccessfulRefreshAt).toBeInstanceOf(Date);
  });

  it('returns the latest successful snapshot as stale fallback when refresh fails', async () => {
    const staleSnapshot = {
      period: 'week' as const,
      taxonomyVersion: 'expense-taxonomy-canonical-v2',
      classifierVersion: 'expense-classifier-db-title-v2',
      range: {
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      totalAmount: BigInt(125000),
      isEmpty: false,
      isStale: true,
      lastSuccessfulRefreshAt: new Date('2026-03-28T01:00:00.000Z'),
      groups: [
        {
          key: 'other' as const,
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
              happenedAt: new Date('2026-03-28T08:00:00.000Z'),
            },
          ],
        },
      ],
    };

    jest
      .spyOn(snapshotService, 'findReusableSnapshot')
      .mockResolvedValue(null as never);
    jest
      .spyOn(prismaService.consumption, 'findMany')
      .mockRejectedValue(new Error('database unavailable'));
    jest
      .spyOn(snapshotService, 'findLatestSuccessfulSnapshot')
      .mockResolvedValue(staleSnapshot as never);
    jest.spyOn(snapshotService, 'saveStaleSnapshot').mockResolvedValue({} as never);

    const overview = await service.getExpenseOverview('user-1', {
      period: 'week',
      anchorDate: new Date('2026-03-28T00:00:00.000Z'),
    });

    expect(overview.isStale).toBe(true);
    expect(overview.isEmpty).toBe(false);
    expect(overview.totalAmount).toBe(BigInt(125000));
    expect(overview.lastSuccessfulRefreshAt?.toISOString()).toBe(
      '2026-03-28T01:00:00.000Z',
    );
    expect(overview.groups).toHaveLength(1);
    expect(overview.groups[0]?.latestTransactions).toHaveLength(1);
    expect(overview.groups[0]?.latestTransactions[0]?.happenedAt).toBeInstanceOf(Date);
  });

  it('serves the latest successful snapshot directly when it was refreshed on the same day', async () => {
    const cachedSnapshot = {
      period: 'week' as const,
      taxonomyVersion: 'expense-taxonomy-canonical-v2',
      classifierVersion: 'expense-classifier-db-title-v2',
      range: {
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      totalAmount: BigInt(321000),
      isEmpty: false,
      isStale: false,
      lastSuccessfulRefreshAt: new Date(),
      groups: [],
    };

    jest
      .spyOn(snapshotService, 'findReusableSnapshot')
      .mockResolvedValue(cachedSnapshot as never);

    const overview = await service.getExpenseOverview('user-1', {
      period: 'week',
      anchorDate: new Date(),
    });

    expect(overview).toBe(cachedSnapshot);
    expect(prismaService.consumption.findMany).not.toHaveBeenCalled();
    expect(snapshotService.saveSuccessfulSnapshot).not.toHaveBeenCalled();
  });

  it('refreshes from source again when the latest successful snapshot is from a previous day', async () => {
    jest.spyOn(snapshotService, 'findReusableSnapshot').mockResolvedValue({
      period: 'week',
      taxonomyVersion: 'expense-taxonomy-canonical-v2',
      classifierVersion: 'expense-classifier-db-title-v2',
      range: {
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      totalAmount: BigInt(111000),
      isEmpty: false,
      isStale: false,
      lastSuccessfulRefreshAt: new Date('2026-03-27T01:00:00.000Z'),
      groups: [],
    } as never);
    jest.spyOn(prismaService.consumption, 'findMany').mockResolvedValue([]);
    jest
      .spyOn(snapshotService, 'saveSuccessfulSnapshot')
      .mockResolvedValue({} as never);

    const overview = await service.getExpenseOverview('user-1', {
      period: 'week',
      anchorDate: new Date('2026-03-28T00:00:00.000Z'),
    });

    expect(prismaService.consumption.findMany).toHaveBeenCalled();
    expect(snapshotService.saveSuccessfulSnapshot).toHaveBeenCalled();
    expect(overview.isStale).toBe(false);
  });

  it('classifies transactions into stable Vietnamese groups and calculates percentages', () => {
    const overview = service.buildOverview(
      'week',
      {
        anchorDate: new Date('2026-03-28T00:00:00.000Z'),
        start: new Date('2026-03-23T00:00:00.000Z'),
        end: new Date('2026-03-29T23:59:59.999Z'),
      },
      [
        {
          id: 'tx-essential',
          userId: 'user-1',
          title: 'Bữa trưa',
          amount: BigInt(40000),
          date: new Date('2026-03-28T05:30:00.000Z'),
          createdAt: new Date('2026-03-28T05:30:00.000Z'),
          updatedAt: new Date('2026-03-28T05:30:00.000Z'),
        } as Consumption,
        {
          id: 'tx-housing',
          userId: 'user-1',
          title: 'Tiền điện',
          amount: BigInt(60000),
          date: new Date('2026-03-27T05:30:00.000Z'),
          createdAt: new Date('2026-03-27T05:30:00.000Z'),
          updatedAt: new Date('2026-03-27T05:30:00.000Z'),
        } as Consumption,
      ],
      false,
      new Date('2026-03-28T01:00:00.000Z'),
    );

    expect(overview.groups).toEqual([
      expect.objectContaining({
        key: 'essential',
        amount: BigInt(40000),
        percentage: 40,
      }),
      expect.objectContaining({
        key: 'housing',
        amount: BigInt(60000),
        percentage: 60,
      }),
    ]);
  });
});
