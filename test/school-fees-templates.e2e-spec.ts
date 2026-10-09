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

describe('SchoolFees templates API (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;
  let childId: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-template-e2e-'));
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

  const baseUrl = () => `/api/school-fees/children/${childId}/templates`;

  it('lists, creates, updates and deletes a shared template', async () => {
    const created = await request(app.getHttpServer())
      .post(baseUrl())
      .send({
        type: 'MONTHLY_FIXED',
        name: 'Vệ sinh',
        active: true,
        defaultAmount: 12000,
      })
      .expect(201);

    const id = created.body.data.id;

    const listed = await request(app.getHttpServer())
      .get(`${baseUrl()}?type=MONTHLY_FIXED`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].name).toBe('Vệ sinh');

    const updated = await request(app.getHttpServer())
      .put(`${baseUrl()}/${id}`)
      .send({
        type: 'MONTHLY_FIXED',
        name: 'Vệ sinh',
        active: false,
        defaultAmount: 15000,
      })
      .expect(200);
    expect(updated.body.data.active).toBe(false);
    expect(updated.body.data.defaultAmount).toBe(15000);

    const deleted = await request(app.getHttpServer())
      .delete(`${baseUrl()}/${id}`)
      .expect(200);
    expect(deleted.body.data).toBe(id);

    const empty = await request(app.getHttpServer())
      .get(baseUrl())
      .expect(200);
    expect(empty.body.data).toEqual([]);
  });

  it('supports daily price map with missing month key', async () => {
    const created = await request(app.getHttpServer())
      .post(baseUrl())
      .send({
        type: 'DAILY',
        name: 'Ăn bán trú',
        active: true,
        priceByMonth: {
          '2026-09': 20000,
        },
      })
      .expect(201);

    expect(created.body.data.priceByMonth['2026-09']).toBe(20000);
    expect(created.body.data.priceByMonth['2026-10']).toBeUndefined();
  });

  it('rejects invalid discriminated fields and invalid daily month keys', async () => {
    await request(app.getHttpServer())
      .post(baseUrl())
      .send({
        type: 'MONTHLY_FIXED',
        name: 'Sai',
        active: true,
        defaultAmount: 12000,
        priceByMonth: {},
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(baseUrl())
      .send({
        type: 'DAILY',
        name: 'Sai tháng',
        active: true,
        priceByMonth: {
          '2026-13': 20000,
        },
      })
      .expect(400);
  });
});
