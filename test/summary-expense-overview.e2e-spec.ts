import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '@/common/services/prisma.service';
import { ConsumptionController } from '@/app/api/consumption/consumption.controller';
import { ConsumptionService } from '@/app/api/consumption/consumption.service';
import { ExpenseClassifierService } from '@/app/api/consumption/services/expense-classifier.service';
import { ExpenseOverviewAggregateService } from '@/app/api/consumption/services/expense-overview-aggregate.service';
import { ExpenseOverviewSnapshotService } from '@/app/api/consumption/services/expense-overview-snapshot.service';

jest.mock('@/common', () => ({
  ApiBadRequestResponse: () => () => undefined,
  ApiPagination: () => () => undefined,
  BodyWithParam: () => () => undefined,
  CollectionEntity: class CollectionEntity<T> {
    constructor(public data: T[]) {}
  },
  PaginationEntity: class PaginationEntity<T> {
    data: T[];
    meta: unknown;

    constructor(payload: { data: T[]; meta: unknown }) {
      this.data = payload.data;
      this.meta = payload.meta;
    }
  },
  SuccessEntity: class SuccessEntity<T> {
    statusCode = 2000;
    message = 'success';

    constructor(public data: T) {}
  },
}));

jest.mock('@/app/api/auth/guards', () => ({
  ApiAuthGuard: () => () => undefined,
  ApiJwtAuthGuard: class ApiJwtAuthGuard {},
}));

const { ApiJwtAuthGuard } = jest.requireMock('@/app/api/auth/guards') as {
  ApiJwtAuthGuard: new () => unknown;
};

const createPrismaServiceMock = () => ({
  paginator: jest.fn(),
  consumption: {
    findMany: jest.fn(),
  },
  expenseOverviewSnapshot: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
  },
});

describe('SummaryExpenseOverviewController (e2e)', () => {
  let app: INestApplication;
  const prismaServiceMock = createPrismaServiceMock();

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConsumptionController],
      providers: [
        ConsumptionService,
        ExpenseClassifierService,
        ExpenseOverviewAggregateService,
        ExpenseOverviewSnapshotService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    })
      .overrideGuard(ApiJwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req, _res, next) => {
      req.user = { id: 'user-1' };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns expense overview snapshot for a valid request', async () => {
    prismaServiceMock.consumption.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        userId: 'user-1',
        title: 'Bua trua 1',
        amount: BigInt(45000),
        date: new Date('2026-03-27T05:30:00.000Z'),
        createdAt: new Date('2026-03-27T05:30:00.000Z'),
        updatedAt: new Date('2026-03-27T05:30:00.000Z'),
      },
      {
        id: 'tx-2',
        userId: 'user-1',
        title: 'Bua trua 2',
        amount: BigInt(120000),
        date: new Date('2026-03-26T05:30:00.000Z'),
        createdAt: new Date('2026-03-26T05:30:00.000Z'),
        updatedAt: new Date('2026-03-26T05:30:00.000Z'),
      },
      {
        id: 'tx-3',
        userId: 'user-1',
        title: 'Bua trua 3',
        amount: BigInt(45000),
        date: new Date('2026-03-28T05:30:00.000Z'),
        createdAt: new Date('2026-03-28T05:30:00.000Z'),
        updatedAt: new Date('2026-03-28T05:30:00.000Z'),
      },
    ]);
    prismaServiceMock.expenseOverviewSnapshot.deleteMany.mockResolvedValue({ count: 0 });
    prismaServiceMock.expenseOverviewSnapshot.create.mockResolvedValue({});

    const response = await request(app.getHttpServer())
      .get('/summary/expenses/overview')
      .query({ period: 'week', anchorDate: '2026-03-28' })
      .expect(200);

    expect(response.body.statusCode).toBe(2000);
    expect(response.body.data.period).toBe('week');
    expect(response.body.data.taxonomyVersion).toBe('expense-taxonomy-canonical-v2');
    expect(response.body.data.classifierVersion).toBe('expense-classifier-db-title-v2');
    expect(response.body.data.range.start).toBe('2026-03-22T17:00:00.000Z');
    expect(response.body.data.range.end).toBe('2026-03-29T16:59:59.999Z');
    expect(response.body.data.totalAmount).toBe(210000);
    expect(response.body.data.isEmpty).toBe(false);
    expect(response.body.data.isStale).toBe(false);
    expect(response.body.data.groups).toHaveLength(1);
    expect(response.body.data.groups[0]).toMatchObject({
      key: 'essential',
      label: 'Tiêu dùng thiết yếu',
      order: 1,
      amount: 210000,
      percentage: 100,
      transactionCount: 3,
    });
    expect(response.body.data.groups[0].latestTransactions).toHaveLength(3);
    expect(response.body.data.groups[0].latestTransactions.map((item: { id: string }) => item.id)).toEqual([
      'tx-2',
      'tx-3',
      'tx-1',
    ]);
  });

  it('returns bad request for invalid period', async () => {
    await request(app.getHttpServer())
      .get('/summary/expenses/overview')
      .query({ period: 'quarter' })
      .expect(400);
  });
});
