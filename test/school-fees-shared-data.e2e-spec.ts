import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { readdir, rm, mkdtemp } from 'node:fs/promises';
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

describe('SchoolFees shared data regression (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-shared-e2e-'));

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
    app.use((req, _res, next) => {
      req.user = { id: String(req.headers['x-test-user'] || '') };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('two authenticated accounts resolve, read and mutate the same shared child JSON', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/school-fees/children/default')
      .set('x-test-user', 'account-a')
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/api/school-fees/children/default')
      .set('x-test-user', 'account-b')
      .expect(200);

    const childId = first.body.data.id;
    expect(second.body.data.id).toBe(childId);

    await request(app.getHttpServer())
      .post(`/api/school-fees/children/${childId}/templates`)
      .set('x-test-user', 'account-a')
      .send({
        type: 'MONTHLY_FIXED',
        name: 'Khoản shared từ A',
        active: true,
        defaultAmount: 12345,
      })
      .expect(201);

    const readByB = await request(app.getHttpServer())
      .get(`/api/school-fees/children/${childId}/templates`)
      .set('x-test-user', 'account-b')
      .expect(200);

    expect(
      readByB.body.data.some(
        (template: { name: string }) => template.name === 'Khoản shared từ A',
      ),
    ).toBe(true);

    const childFiles = await readdir(join(dataDir, 'children'));
    expect(childFiles).toContain(`${childId}.json`);
    expect(childFiles.join(' ')).not.toContain('account-a');
    expect(childFiles.join(' ')).not.toContain('account-b');
  });
});
