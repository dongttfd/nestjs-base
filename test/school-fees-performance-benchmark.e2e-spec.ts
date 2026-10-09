import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { ApiJwtAuthGuard } from '@/app/api/auth/guards';
import { ApiJwtAuthGuard as ActualApiJwtAuthGuard } from '@/app/api/auth/guards/api-jwt-auth.guard';
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

const NOW = '2026-09-21T00:00:00.000Z';
const ITERATIONS = 20;
const API_AVERAGE_THRESHOLD_MS = 500;
const CHILD_COUNT = 10;
const SCHOOL_YEAR_COUNT = 10;
const MONTH_COUNT = 12;
const ITEM_COUNT = 20;
const ATTENDANCE_DAY_COUNT = 31;

describe('SchoolFees acceptance performance benchmark (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;
  let childId: string;

  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-perf-benchmark-'));
    const childIds = Array.from({ length: CHILD_COUNT }, () => randomUUID());
    childId = childIds[0];

    const buildMonth = (monthKey: string) => {
      const attendanceDates = Array.from(
        { length: ATTENDANCE_DAY_COUNT },
        (_, index) => `${monthKey}-${String(index + 1).padStart(2, '0')}`,
      );
      const items = Array.from({ length: ITEM_COUNT }, (_, index) =>
        index < ITEM_COUNT - 2
          ? {
            id: randomUUID(),
            type: 'MONTHLY_FIXED',
            name: `Khoản cố định ${index + 1}`,
            amount: 10000 + index * 1000,
            source: 'CUSTOM',
            createdAt: NOW,
            updatedAt: NOW,
          }
          : {
            id: randomUUID(),
            type: 'DAILY',
            name: `Khoản theo ngày ${index + 1}`,
            unitPrice: 5000 + index * 1000,
            source: 'CUSTOM',
            createdAt: NOW,
            updatedAt: NOW,
          },
      );

      return {
        monthKey,
        paymentStatus: 'UNPAID',
        attendanceDates,
        items,
        createdAt: NOW,
        updatedAt: NOW,
      };
    };

    const buildSchoolYears = () =>
      Array.from({ length: SCHOOL_YEAR_COUNT }, (_, yearIndex) => {
        const startYear = 2026 - yearIndex;
        const id = `${startYear}-${startYear + 1}`;
        const monthKeys = Array.from(
          { length: MONTH_COUNT },
          (_, monthIndex) =>
            `${startYear}-${String(monthIndex + 1).padStart(2, '0')}`,
        );

        return {
          id,
          startMonthKey: monthKeys[0],
          endMonthKey: monthKeys[MONTH_COUNT - 1],
          annualFees: [],
          months: Object.fromEntries(
            monthKeys.map((monthKey) => [monthKey, buildMonth(monthKey)]),
          ),
          createdAt: NOW,
          updatedAt: NOW,
        };
      });

    await mkdir(join(dataDir, 'children'), { recursive: true });
    await writeFile(
      join(dataDir, 'children.json'),
      JSON.stringify({
        schemaVersion: 1,
        defaultChildId: childId,
        children: childIds.map((id) => ({
          id,
          displayName: null,
          createdAt: NOW,
          updatedAt: NOW,
        })),
      }),
    );
    await Promise.all(
      childIds.map((id) =>
        writeFile(
          join(dataDir, 'children', `${id}.json`),
          JSON.stringify({
            schemaVersion: 1,
            childId: id,
            status: 'NEW',
            defaultsSeedVersion: 2,
            templates: [],
            schoolYears: buildSchoolYears(),
          }),
        ),
      ),
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
      .overrideGuard(ActualApiJwtAuthGuard)
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

  afterAll(async () => {
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('keeps average month-detail API response below 500ms on acceptance dataset', async () => {
    const endpoint = `/api/school-fees/children/${childId}/school-years/2026-2027/months/2026-10`;

    await request(app.getHttpServer()).get(endpoint).expect(200);

    const durations: number[] = [];

    for (let index = 0; index < ITERATIONS; index += 1) {
      const startedAt = performance.now();

      const response = await request(app.getHttpServer())
        .get(endpoint)
        .expect(200);

      durations.push(performance.now() - startedAt);
      expect(response.body.data.monthlyItems).toHaveLength(ITEM_COUNT);
      expect(response.body.data.attendanceCount).toBe(ATTENDANCE_DAY_COUNT);
    }

    const averageMs =
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

    process.stdout.write(
      `School Fees API benchmark average: ${averageMs.toFixed(2)}ms over ${ITERATIONS} requests\n`,
    );

    expect(averageMs).toBeLessThan(API_AVERAGE_THRESHOLD_MS);
  });
});
