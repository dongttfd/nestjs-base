import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ApiJwtAuthGuard } from '@/app/api/auth/guards';
import { SchoolFeesPerformanceInterceptor } from '@/app/api/school-fees/interceptors/school-fees-performance.interceptor';
import { JsonSchoolFeesRepository } from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesController } from '@/app/api/school-fees/school-fees.controller';
import { SchoolFeesService } from '@/app/api/school-fees/school-fees.service';
import { SchoolFeesCalculatorService } from '@/app/api/school-fees/services/school-fees-calculator.service';
import { SchoolFeesOverviewService } from '@/app/api/school-fees/services/school-fees-overview.service';
import { SchoolFeesSnapshotService } from '@/app/api/school-fees/services/school-fees-snapshot.service';
import { SchoolFeesTemplateEligibilityService } from '@/app/api/school-fees/services/school-fees-template-eligibility.service';
import { SchoolFeesTemplateService } from '@/app/api/school-fees/services/school-fees-template.service';
import { SchoolYearLazyMonthService } from '@/app/api/school-fees/services/school-year-lazy-month.service';
import { SchoolYearService } from '@/app/api/school-fees/services/school-year.service';

jest.mock('@/common', () => ({
  ApiUnauthenticatedResponse: () => () => undefined,
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

describe('SchoolFees overview API (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;
  let childId: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-overview-e2e-'));
    childId = randomUUID();
    const now = '2026-09-21T00:00:00.000Z';

    await mkdir(join(dataDir, 'children'), { recursive: true });
    await writeFile(
      join(dataDir, 'children.json'),
      JSON.stringify({
        schemaVersion: 1,
        defaultChildId: childId,
        children: [
          {
            id: childId,
            displayName: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    );
    await writeFile(
      join(dataDir, 'children', `${childId}.json`),
      JSON.stringify({
        schemaVersion: 1,
        childId,
        status: 'NEW',
        defaultsSeedVersion: 2,
        templates: [],
        schoolYears: [
          {
            id: '2026-2027',
            startMonthKey: '2026-09',
            endMonthKey: '2026-10',
            annualFees: [
              {
                id: randomUUID(),
                name: 'Đồng phục',
                amount: 250000,
                assignedMonthKey: '2026-09',
                source: 'CUSTOM',
                createdAt: now,
                updatedAt: now,
              },
            ],
            months: {
              '2026-09': {
                monthKey: '2026-09',
                paymentStatus: 'PAID',
                attendanceDates: ['2026-09-01'],
                items: [
                  {
                    id: randomUUID(),
                    type: 'MONTHLY_FIXED',
                    name: 'Vệ sinh',
                    amount: 12000,
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
      }),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SchoolFeesController],
      providers: [
        SchoolFeesService,
        SchoolFeesPerformanceInterceptor,
        SchoolFeesCalculatorService,
        SchoolFeesOverviewService,
        SchoolFeesTemplateEligibilityService,
        SchoolFeesTemplateService,
        SchoolFeesSnapshotService,
        SchoolYearService,
        SchoolYearLazyMonthService,
        JsonSchoolFeesRepository,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) =>
              key === 'schoolFeesDataDir' ? dataDir : fallback,
          },
        },
      ],
    })
      .overrideGuard(ApiJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
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
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('lists and returns school-year overview detail', async () => {
    const base = `/api/school-fees/children/${childId}/school-years`;

    const list = await request(app.getHttpServer()).get(base).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: '2026-2027',
      annualTotalAmount: 250000,
      totalAmount: 262000,
    });
    expect(list.body.data[0].months).toEqual([
      expect.objectContaining({
        monthKey: '2026-09',
        created: true,
        paymentStatus: 'PAID',
      }),
      { monthKey: '2026-10', created: false },
    ]);

    const detail = await request(app.getHttpServer())
      .get(`${base}/2026-2027`)
      .expect(200);
    expect(detail.body.data.id).toBe('2026-2027');
    expect(detail.body.data.totalAmount).toBe(262000);
  });
});
