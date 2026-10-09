import { INestApplication, ValidationPipe } from '@nestjs/common';
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

describe('SchoolFees month API (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;
  let childId: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-month-e2e-'));
    childId = randomUUID();
    const now = '2026-09-21T00:00:00.000Z';

    await mkdir(join(dataDir, 'children'), { recursive: true });
    await writeFile(
      join(dataDir, 'children.json'),
      JSON.stringify({
        schemaVersion: 1,
        defaultChildId: childId,
        children: [{ id: childId, displayName: null, createdAt: now, updatedAt: now }],
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
        schoolYears: [{
          id: '2026-2027',
          startMonthKey: '2026-09',
          endMonthKey: '2027-05',
          annualFees: [{
            id: randomUUID(),
            name: 'Đồng phục',
            amount: 250000,
            assignedMonthKey: '2026-09',
            source: 'CUSTOM',
            createdAt: now,
            updatedAt: now,
          }],
          months: {
            '2026-09': {
              monthKey: '2026-09',
              paymentStatus: 'UNPAID',
              attendanceDates: [],
              items: [{
                id: randomUUID(),
                type: 'DAILY',
                name: 'Ăn bán trú',
                unitPrice: 20000,
                source: 'CUSTOM',
                createdAt: now,
                updatedAt: now,
              }],
              createdAt: now,
              updatedAt: now,
            },
          },
          createdAt: now,
          updatedAt: now,
        }],
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
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }));
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const monthUrl = () =>
    `/api/school-fees/children/${childId}/school-years/2026-2027/months/2026-09`;

  it('gets month detail and updates attendance', async () => {
    const initial = await request(app.getHttpServer()).get(monthUrl()).expect(200);
    expect(initial.body.data.totalAmount).toBe(250000);

    const updated = await request(app.getHttpServer())
      .put(`${monthUrl()}/attendance`)
      .send({ attendanceDates: ['2026-09-01', '2026-09-02'] })
      .expect(200);

    expect(updated.body.data.attendanceCount).toBe(2);
    expect(updated.body.data.totalAmount).toBe(290000);
  });

  it('creates, updates and deletes a monthly item', async () => {
    const created = await request(app.getHttpServer())
      .post(`${monthUrl()}/items`)
      .send({ type: 'MONTHLY_FIXED', name: 'Vệ sinh', amount: 12000 })
      .expect(201);

    const item = created.body.data.monthlyItems.find(
      (entry: { name: string }) => entry.name === 'Vệ sinh',
    );
    expect(item).toBeTruthy();

    await request(app.getHttpServer())
      .put(`${monthUrl()}/items/${item.id}`)
      .send({ type: 'MONTHLY_FIXED', name: 'Vệ sinh', amount: 15000 })
      .expect(200);

    const deleted = await request(app.getHttpServer())
      .delete(`${monthUrl()}/items/${item.id}`)
      .expect(200);

    expect(
      deleted.body.data.monthlyItems.some(
        (entry: { id: string }) => entry.id === item.id,
      ),
    ).toBe(false);
  });

  it('updates payment status and blocks missing daily price', async () => {
    await request(app.getHttpServer())
      .put(`${monthUrl()}/payment-status`)
      .send({ status: 'PAID' })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post(`${monthUrl()}/items`)
      .send({
        type: 'DAILY',
        name: 'Dịch vụ theo ngày',
        unitPrice: null,
        confirmReopenPaidMonth: true,
      })
      .expect(201);

    expect(created.body.data.paymentStatus).toBe('UNPAID');

    const blocked = await request(app.getHttpServer())
      .put(`${monthUrl()}/payment-status`)
      .send({ status: 'PAID' })
      .expect(422);
    expect(blocked.body.errorCode).toBe('DAILY_PRICE_MISSING');
  });

  it('maps malformed and unknown childId before business lookup', async () => {
    await request(app.getHttpServer())
      .get('/api/school-fees/children/not-a-uuid/school-years/2026-2027/months/2026-09')
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/school-fees/children/${randomUUID()}/school-years/2026-2027/months/2026-09`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/school-fees/children/%252e%252e%252fetc/school-years/2026-2027/months/2026-09')
      .expect(400);
  });

  it('rejects wrong discriminated fields', async () => {
    await request(app.getHttpServer())
      .post(`${monthUrl()}/items`)
      .send({
        type: 'MONTHLY_FIXED',
        name: 'Sai',
        amount: 1000,
        unitPrice: 1000,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${monthUrl()}/items`)
      .send({
        type: 'DAILY',
        name: 'Thiếu giá',
      })
      .expect(400);
  });
});
