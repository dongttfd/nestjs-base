import {
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { mkdtemp, rm } from 'node:fs/promises';
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

describe('SchoolFees performance telemetry (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-perf-e2e-'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SchoolFeesController],
      providers: [
        SchoolFeesService,
        SchoolFeesCalculatorService,
        SchoolFeesOverviewService,
        SchoolFeesTemplateEligibilityService,
        SchoolFeesTemplateService,
        SchoolFeesSnapshotService,
        SchoolYearService,
        SchoolYearLazyMonthService,
        SchoolFeesPerformanceInterceptor,
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
    app.use((req, _res, next) => {
      req.user = { id: 'must-not-be-logged-user' };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('accepts allowlisted metric, emits structured log and returns 204', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await request(app.getHttpServer())
      .post('/api/school-fees/telemetry/performance')
      .send({
        name: 'school_fees_interaction_ms',
        durationMs: 80,
        route: '/account/school-fees',
      })
      .expect(204);

    const serialized = JSON.stringify(logSpy.mock.calls);
    expect(serialized).toContain('school_fees_interaction_ms');
    expect(serialized).not.toContain('must-not-be-logged-user');
  });

  it('rejects non-allowlisted metric and unexpected business payload fields', async () => {
    await request(app.getHttpServer())
      .post('/api/school-fees/telemetry/performance')
      .send({
        name: 'school_fees_amount_ms',
        durationMs: 10,
        route: '/account/school-fees',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/school-fees/telemetry/performance')
      .send({
        name: 'school_fees_page_load_ms',
        durationMs: 10,
        route: '/account/school-fees',
        userId: 'secret',
        amount: 999999,
      })
      .expect(400);
  });

  it('warns when frontend metric exceeds its threshold', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await request(app.getHttpServer())
      .post('/api/school-fees/telemetry/performance')
      .send({
        name: 'school_fees_page_load_ms',
        durationMs: 3001,
        route: '/account/school-fees',
      })
      .expect(204);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'school_fees_page_load_ms',
        thresholdExceeded: true,
      }),
    );
  });
});
