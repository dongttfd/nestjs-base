import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  SchoolFeesDataFile,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesSnapshotService } from './school-fees-snapshot.service';
import { SchoolFeesTemplateEligibilityService } from './school-fees-template-eligibility.service';
import { SchoolYearLazyMonthService } from './school-year-lazy-month.service';

const childId = '550e8400-e29b-41d4-a716-446655440000';
const fixedTemplateId = '22222222-2222-4222-8222-222222222222';
const dailyTemplateId = '33333333-3333-4333-8333-333333333333';
const returningFixedTemplateId = '55555555-5555-4555-8555-555555555555';
const now = '2026-09-21T00:00:00.000Z';

const buildData = (): SchoolFeesDataFile => ({
  schemaVersion: 1,
  childId,
  status: 'NEW',
  defaultsSeedVersion: 2,
  templates: [
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
  schoolYears: [
    {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualFees: [],
      months: {
        '2026-09': {
          monthKey: '2026-09',
          paymentStatus: 'UNPAID',
          attendanceDates: [],
          items: [],
          createdAt: now,
          updatedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    },
  ],
});

describe('SchoolYearLazyMonthService', () => {
  let data: SchoolFeesDataFile;
  let service: SchoolYearLazyMonthService;
  let repository: jest.Mocked<
    Pick<JsonSchoolFeesRepository, 'readChild' | 'mutateChild'>
  >;

  beforeEach(() => {
    data = buildData();
    repository = {
      readChild: jest.fn(async (requestedChildId: string) => {
        expect(requestedChildId).toBe(childId);

        return structuredClone(data);
      }),
      mutateChild: jest.fn(async (_requestedChildId, mutator) => {
        data = await mutator(structuredClone(data));

        return structuredClone(data);
      }),
    };

    service = new SchoolYearLazyMonthService(
      repository as unknown as JsonSchoolFeesRepository,
      new SchoolFeesSnapshotService(),
      new SchoolFeesTemplateEligibilityService(),
    );
  });

  it('rejects status-mismatched templates with 409 eligibility and no partial snapshot', async () => {
    const before = structuredClone(data.schoolYears[0]);

    await expect(
      service.createMonth(
        childId,
        '2026-2027',
        '2026-10',
        [returningFixedTemplateId],
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: 'FEE_TEMPLATE_NOT_ELIGIBLE',
      }),
    });

    expect(data.schoolYears[0]).toEqual(before);
    expect(data.schoolYears[0].months['2026-10']).toBeUndefined();
  });

  it('creates selected active templates and uses exact month daily price/null', async () => {
    const october = await service.createMonth(
      childId,
      '2026-2027',
      '2026-10',
      [fixedTemplateId, dailyTemplateId],
    );

    expect(october.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MONTHLY_FIXED',
          amount: 12000,
        }),
        expect.objectContaining({
          type: 'DAILY',
          unitPrice: null,
        }),
      ]),
    );
  });

  it('snapshots future-created month independently from later template changes', async () => {
    const october = await service.createMonth(
      childId,
      '2026-2027',
      '2026-10',
      [fixedTemplateId],
    );

    const template = data.templates.find((item) => item.id === fixedTemplateId);
    if (template?.type === 'MONTHLY_FIXED') {
      template.defaultAmount = 99000;
    }

    expect(
      october.items.find((item) => item.type === 'MONTHLY_FIXED'),
    ).toMatchObject({ amount: 12000 });
    expect(
      data.schoolYears[0].months['2026-10'].items.find(
        (item) => item.type === 'MONTHLY_FIXED',
      ),
    ).toMatchObject({ amount: 12000 });
  });

  it('rejects duplicate/out-of-range month', async () => {
    await expect(
      service.createMonth(
        childId,
        '2026-2027',
        '2026-09',
        [],
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.createMonth(
        childId,
        '2026-2027',
        '2028-01',
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inactive, missing or annual templates from month selection', async () => {
    data.templates[0].active = false;

    await expect(
      service.createMonth(
        childId,
        '2026-2027',
        '2026-10',
        [fixedTemplateId],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses exact daily price when configured for the lazy-created month', async () => {
    const daily = data.templates.find((item) => item.id === dailyTemplateId);
    if (daily?.type === 'DAILY') {
      daily.priceByMonth['2026-10'] = 21000;
    }

    const month = await service.createMonth(
      childId,
      '2026-2027',
      '2026-10',
      [dailyTemplateId],
    );

    expect(month.items[0]).toMatchObject({
      type: 'DAILY',
      unitPrice: 21000,
    });
  });

  it('rejects missing year and malformed/before-range month keys', async () => {
    await expect(
      service.createMonth(childId, '2025-2026', '2026-10', []),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.createMonth(childId, '2026-2027', 'bad-month', []),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createMonth(childId, '2026-2027', '2026-08', []),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing and annual templates explicitly', async () => {
    await expect(
      service.createMonth(
        childId,
        '2026-2027',
        '2026-10',
        ['44444444-4444-4444-8444-444444444444'],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    data.templates.push({
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Annual',
      type: 'ANNUAL',
      active: true,
      applicableChildStatus: null,
      defaultAmount: 1,
      defaultMonthOffset: 0,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      service.createMonth(
        childId,
        '2026-2027',
        '2026-10',
        ['44444444-4444-4444-8444-444444444444'],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps repository errors from mutation', async () => {
    repository.mutateChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('INVALID_CHILD_ID', 'invalid'),
    );
    await expect(
      service.createMonth(childId, '2026-2027', '2026-10', []),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.mutateChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('CHILD_NOT_FOUND', 'missing'),
    );
    await expect(
      service.createMonth(childId, '2026-2027', '2026-10', []),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.mutateChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('SCHOOL_FEES_DATA_WRITE_FAILED', 'write'),
    );
    await expect(
      service.createMonth(childId, '2026-2027', '2026-10', []),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    repository.mutateChild.mockRejectedValueOnce(new Error('unexpected'));
    await expect(
      service.createMonth(childId, '2026-2027', '2026-10', []),
    ).rejects.toThrow('unexpected');
  });

});
