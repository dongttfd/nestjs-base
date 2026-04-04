import { Consumption } from '@prisma/client';
import { PrismaService } from '@/common/services/prisma.service';
import { ConsumptionService } from '@/app/api/consumption/consumption.service';
import { ExpenseOverviewAggregateService } from '@/app/api/consumption/services/expense-overview-aggregate.service';
import { ExpenseOverviewSnapshotService } from '@/app/api/consumption/services/expense-overview-snapshot.service';

const createPrismaServiceMock = () => {
  const prismaServiceMock = {
    consumption: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    expenseOverviewSnapshot: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prismaServiceMock as never),
    ),
  };

  return prismaServiceMock as unknown as PrismaService;
};

const createAggregateServiceMock = () =>
  ({
    getExpenseOverview: jest.fn(),
  }) as unknown as ExpenseOverviewAggregateService;

const createSnapshotServiceMock = () =>
  ({
    invalidateSnapshotsByConsumptionDates: jest.fn(),
  }) as unknown as ExpenseOverviewSnapshotService;

describe('ConsumptionService', () => {
  let prismaService: PrismaService;
  let aggregateService: ExpenseOverviewAggregateService;
  let snapshotService: ExpenseOverviewSnapshotService;
  let service: ConsumptionService;

  beforeEach(() => {
    prismaService = createPrismaServiceMock();
    aggregateService = createAggregateServiceMock();
    snapshotService = createSnapshotServiceMock();
    service = new ConsumptionService(
      prismaService,
      aggregateService,
      snapshotService,
    );
  });

  it('invalidates overview snapshots after creating a consumption', async () => {
    const createdConsumption = {
      id: 'tx-1',
      userId: 'user-1',
      title: 'Bua trua',
      amount: BigInt(45000),
      date: new Date('2026-03-31T05:30:00.000Z'),
      createdAt: new Date('2026-03-31T05:30:00.000Z'),
      updatedAt: new Date('2026-03-31T05:30:00.000Z'),
    } as Consumption;

    jest
      .spyOn(prismaService.consumption, 'create')
      .mockResolvedValue(createdConsumption as never);

    const result = await service.create('user-1', {
      title: 'Bua trua',
      amount: 45000,
      date: new Date('2026-03-31T05:30:00.000Z'),
    });

    expect(result).toBe(createdConsumption);
    expect((prismaService as any).$transaction).toHaveBeenCalled();
    expect(snapshotService.invalidateSnapshotsByConsumptionDates).toHaveBeenCalledWith(
      'user-1',
      [createdConsumption.date],
      expect.any(Object),
    );
  });

  it('invalidates both old and new dates after updating a consumption', async () => {
    const existingConsumption = {
      id: 'tx-1',
      userId: 'user-1',
      title: 'Bua trua',
      amount: BigInt(45000),
      date: new Date('2026-03-31T05:30:00.000Z'),
      createdAt: new Date('2026-03-31T05:30:00.000Z'),
      updatedAt: new Date('2026-03-31T05:30:00.000Z'),
    } as Consumption;
    const updatedConsumption = {
      ...existingConsumption,
      amount: BigInt(65000),
      date: new Date('2026-04-01T05:30:00.000Z'),
      updatedAt: new Date('2026-04-01T05:30:00.000Z'),
    } as Consumption;

    jest
      .spyOn(prismaService.consumption, 'findFirst')
      .mockResolvedValue(existingConsumption as never);
    jest
      .spyOn(prismaService.consumption, 'update')
      .mockResolvedValue(updatedConsumption as never);

    const result = await service.update('user-1', {
      id: 'tx-1',
      title: 'Bua trua',
      amount: 65000,
      date: new Date('2026-04-01T05:30:00.000Z'),
    });

    expect(result).toBe(updatedConsumption);
    expect((prismaService as any).$transaction).toHaveBeenCalled();
    expect(snapshotService.invalidateSnapshotsByConsumptionDates).toHaveBeenCalledWith(
      'user-1',
      [existingConsumption.date, updatedConsumption.date],
      expect.any(Object),
    );
  });

  it('invalidates overview snapshots after deleting a consumption', async () => {
    const existingConsumption = {
      id: 'tx-1',
      userId: 'user-1',
      title: 'Bua trua',
      amount: BigInt(45000),
      date: new Date('2026-03-31T05:30:00.000Z'),
      createdAt: new Date('2026-03-31T05:30:00.000Z'),
      updatedAt: new Date('2026-03-31T05:30:00.000Z'),
    } as Consumption;

    jest
      .spyOn(prismaService.consumption, 'findFirst')
      .mockResolvedValue(existingConsumption as never);
    jest
      .spyOn(prismaService.consumption, 'delete')
      .mockResolvedValue(existingConsumption as never);

    const result = await service.destroy('user-1', 'tx-1');

    expect(result).toBe(existingConsumption);
    expect((prismaService as any).$transaction).toHaveBeenCalled();
    expect(snapshotService.invalidateSnapshotsByConsumptionDates).toHaveBeenCalledWith(
      'user-1',
      [existingConsumption.date],
      expect.any(Object),
    );
  });
});
