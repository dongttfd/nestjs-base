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

describe('SchoolFees school year API (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;
  let childId: string;
  let annualTemplateId: string;
  let fixedTemplateId: string;
  let dailyTemplateId: string;
  let returningAnnualTemplateId: string;
  let returningFixedTemplateId: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-year-e2e-'));
    childId = randomUUID();
    annualTemplateId = randomUUID();
    fixedTemplateId = randomUUID();
    dailyTemplateId = randomUUID();
    returningAnnualTemplateId = randomUUID();
    returningFixedTemplateId = randomUUID();
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
        templates: [
          {
            id: annualTemplateId,
            name: 'Đồ dùng bán trú - trẻ mới',
            type: 'ANNUAL',
            active: true,
            applicableChildStatus: 'NEW',
            defaultAmount: 250000,
            defaultMonthOffset: 0,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: fixedTemplateId,
            name: 'Vệ sinh',
            type: 'MONTHLY_FIXED',
            active: true,
            applicableChildStatus: null,
            defaultAmount: 12000,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: dailyTemplateId,
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
            id: returningAnnualTemplateId,
            name: 'Đồ dùng bán trú - trẻ cũ',
            type: 'ANNUAL',
            active: true,
            applicableChildStatus: 'RETURNING',
            defaultAmount: 100000,
            defaultMonthOffset: 0,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: returningFixedTemplateId,
            name: 'Khoản tháng trẻ cũ',
            type: 'MONTHLY_FIXED',
            active: true,
            applicableChildStatus: 'RETURNING',
            defaultAmount: 13000,
            createdAt: now,
            updatedAt: now,
          },
        ],
        schoolYears: [],
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

  afterEach(async () => {
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const yearsUrl = () =>
    `/api/school-fees/children/${childId}/school-years`;

  it('creates school year with first month and lazy creates later month', async () => {
    const created = await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [annualTemplateId],
        firstMonthTemplateIds: [fixedTemplateId, dailyTemplateId],
      })
      .expect(201);

    expect(created.body.data.annualFees).toHaveLength(1);
    expect(Object.keys(created.body.data.months)).toEqual(['2026-09']);

    const lazy = await request(app.getHttpServer())
      .post(`${yearsUrl()}/2026-2027/months/2026-10`)
      .send({
        templateIds: [fixedTemplateId, dailyTemplateId],
      })
      .expect(201);

    expect(lazy.body.data.monthKey).toBe('2026-10');
    expect(
      lazy.body.data.items.find(
        (item: { type: string }) => item.type === 'DAILY',
      ).unitPrice,
    ).toBeNull();
  });

  it('prepares NEW to RETURNING before second-year selection and is idempotent', async () => {
    const firstPrepare = await request(app.getHttpServer())
      .post(`${yearsUrl()}/prepare`)
      .send({})
      .expect(201);

    expect(firstPrepare.body.data.status).toBe('NEW');

    await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [annualTemplateId],
        firstMonthTemplateIds: [],
      })
      .expect(201);

    const secondPrepare = await request(app.getHttpServer())
      .post(`${yearsUrl()}/prepare`)
      .send({})
      .expect(201);

    expect(secondPrepare.body.data.status).toBe('RETURNING');

    const retry = await request(app.getHttpServer())
      .post(`${yearsUrl()}/prepare`)
      .send({})
      .expect(201);

    expect(retry.body.data.status).toBe('RETURNING');

    const eligible = await request(app.getHttpServer())
      .get(
        `/api/school-fees/children/${childId}/templates?type=ANNUAL&eligibleForChild=true`,
      )
      .expect(200);

    expect(eligible.body.data.map((item: { id: string }) => item.id)).toContain(
      returningAnnualTemplateId,
    );
    expect(
      eligible.body.data.map((item: { id: string }) => item.id),
    ).not.toContain(annualTemplateId);
  });

  it('rejects status-mismatched template ids with 409 for create-year and lazy-month', async () => {
    await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [annualTemplateId],
        firstMonthTemplateIds: [],
      })
      .expect(201);

    const lazyMismatch = await request(app.getHttpServer())
      .post(`${yearsUrl()}/2026-2027/months/2026-10`)
      .send({ templateIds: [returningFixedTemplateId] })
      .expect(409);

    expect(lazyMismatch.body.errorCode).toBe('FEE_TEMPLATE_NOT_ELIGIBLE');

    const createSecondWithNewTemplate = await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2027-2028',
        startMonthKey: '2027-09',
        endMonthKey: '2028-05',
        annualTemplateIds: [annualTemplateId],
        firstMonthTemplateIds: [],
      })
      .expect(409);

    expect(createSecondWithNewTemplate.body.errorCode).toBe(
      'FEE_TEMPLATE_NOT_ELIGIBLE',
    );
  });

  it('keeps existing 404 mapping for missing/inactive/wrong-type template selection', async () => {
    const missing = await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [randomUUID()],
        firstMonthTemplateIds: [],
      })
      .expect(404);

    expect(missing.body.errorCode).toBe('FEE_TEMPLATE_NOT_FOUND');

    const wrongType = await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [fixedTemplateId],
        firstMonthTemplateIds: [],
      })
      .expect(404);

    expect(wrongType.body.errorCode).toBe('FEE_TEMPLATE_NOT_FOUND');
  });

  it('supports annual item create/update/delete', async () => {
    await request(app.getHttpServer())
      .post(yearsUrl())
      .send({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(`${yearsUrl()}/2026-2027/annual-items`)
      .send({
        name: 'Đồng phục',
        amount: 250000,
        assignedMonthKey: '2026-09',
      })
      .expect(201);

    const itemId = created.body.data.id;

    const updated = await request(app.getHttpServer())
      .put(`${yearsUrl()}/2026-2027/annual-items/${itemId}`)
      .send({
        name: 'Đồng phục',
        amount: 275000,
        assignedMonthKey: '2026-09',
      })
      .expect(200);

    expect(updated.body.data.amount).toBe(275000);

    const deleted = await request(app.getHttpServer())
      .delete(`${yearsUrl()}/2026-2027/annual-items/${itemId}`)
      .expect(200);

    expect(deleted.body.data).toBe(itemId);
  });
});
