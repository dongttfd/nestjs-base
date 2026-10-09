import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
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

describe('SchoolFees foundation (e2e)', () => {
  let app: INestApplication;
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-foundation-e2e-'));

    const configService = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'schoolFeesDataDir' ? dataDir : fallback,
      ),
    } as unknown as ConfigService;

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
          useValue: configService,
        },
      ],
    })
      .overrideGuard(ApiJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use((req, _res, next) => {
      req.user = { id: 'account-a' };
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('bootstraps the shared default child and returns Cache-Control: no-store', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/school-fees/children/default')
      .expect(200);

    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body.statusCode).toBe(2000);
    expect(response.body.data.id).toEqual(expect.any(String));
    expect(response.body.data.status).toBe('NEW');

    const repository = app.get(JsonSchoolFeesRepository);
    const persisted = await repository.readChild(response.body.data.id);

    expect(persisted.status).toBe('NEW');
    expect(persisted.defaultsSeedVersion).toBe(2);
    expect(persisted.templates).toHaveLength(11);
    expect(persisted.schoolYears).toEqual([]);
    expect(response.body.data.defaultsSeedVersion).toBeUndefined();
  });

  it('serves the same childId for concurrent first requests and persists one child file', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer()).get('/api/school-fees/children/default'),
      request(app.getHttpServer()).get('/api/school-fees/children/default'),
      request(app.getHttpServer()).get('/api/school-fees/children/default'),
    ]);

    responses.forEach((response) => expect(response.status).toBe(200));
    const ids = responses.map((response) => response.body.data.id);

    expect(new Set(ids).size).toBe(1);
    expect(
      (await readdir(join(dataDir, 'children'))).filter((name) =>
        name.endsWith('.json'),
      ),
    ).toEqual([`${ids[0]}.json`]);
  });
});
