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
import { SchoolFeesCalculatorService } from './school-fees-calculator.service';
import { SchoolFeesSnapshotService } from './school-fees-snapshot.service';
import { SchoolFeesTemplateEligibilityService } from './school-fees-template-eligibility.service';
import { SchoolYearService } from './school-year.service';

const childId = '550e8400-e29b-41d4-a716-446655440000';
const annualTemplateId = '11111111-1111-4111-8111-111111111111';
const fixedTemplateId = '22222222-2222-4222-8222-222222222222';
const dailyTemplateId = '33333333-3333-4333-8333-333333333333';
const returningAnnualTemplateId = '44444444-4444-4444-8444-444444444444';
const returningFixedTemplateId = '55555555-5555-4555-8555-555555555555';
const now = '2026-09-21T00:00:00.000Z';

const buildData = (): SchoolFeesDataFile => ({
  schemaVersion: 1,
  childId,
  status: 'NEW',
  defaultsSeedVersion: 2,
  templates: [
    {
      id: annualTemplateId,
      name: 'Bảo hiểm',
      type: 'ANNUAL',
      active: true,
      applicableChildStatus: 'NEW',
      defaultAmount: 100000,
      defaultMonthOffset: 99,
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
      name: 'Khoản trẻ cũ',
      type: 'ANNUAL',
      active: true,
      applicableChildStatus: 'RETURNING',
      defaultAmount: 110000,
      defaultMonthOffset: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: returningFixedTemplateId,
      name: 'Tháng trẻ cũ',
      type: 'MONTHLY_FIXED',
      active: true,
      applicableChildStatus: 'RETURNING',
      defaultAmount: 13000,
      createdAt: now,
      updatedAt: now,
    },
  ],
  schoolYears: [],
});

describe('SchoolYearService', () => {
  let data: SchoolFeesDataFile;
  let service: SchoolYearService;
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

    const calculator = new SchoolFeesCalculatorService();
    service = new SchoolYearService(
      repository as unknown as JsonSchoolFeesRepository,
      new SchoolFeesSnapshotService(),
      calculator,
      new SchoolFeesTemplateEligibilityService(),
    );
  });

  it('prepares child status idempotently before the next school year', async () => {
    await expect(service.prepareNextSchoolYear(childId)).resolves.toBe('NEW');
    expect(data.status).toBe('NEW');

    data.schoolYears.push({
      id: '2025-2026',
      startMonthKey: '2025-09',
      endMonthKey: '2026-05',
      annualFees: [],
      months: {},
      createdAt: now,
      updatedAt: now,
    });

    await expect(service.prepareNextSchoolYear(childId)).resolves.toBe(
      'RETURNING',
    );
    expect(data.status).toBe('RETURNING');

    await expect(service.prepareNextSchoolYear(childId)).resolves.toBe(
      'RETURNING',
    );
    expect(data.status).toBe('RETURNING');
  });

  it('final create-year lifecycle guard switches to RETURNING and enforces eligibility', async () => {
    data.schoolYears.push({
      id: '2025-2026',
      startMonthKey: '2025-09',
      endMonthKey: '2026-05',
      annualFees: [],
      months: {},
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [annualTemplateId],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: 'FEE_TEMPLATE_NOT_ELIGIBLE',
      }),
    });
    expect(data.status).toBe('NEW');

    const created = await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [returningAnnualTemplateId],
      firstMonthTemplateIds: [returningFixedTemplateId],
    });

    expect(data.status).toBe('RETURNING');
    expect(created.annualFees[0].sourceTemplateId).toBe(
      returningAnnualTemplateId,
    );
    expect(
      created.months['2026-09'].items[0].sourceTemplateId,
    ).toBe(returningFixedTemplateId);
    expect(data.schoolYears[0].id).toBe('2025-2026');
  });

  it('creates consecutive school year with annual and first-month snapshots', async () => {
    const created = await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [annualTemplateId],
      firstMonthTemplateIds: [fixedTemplateId, dailyTemplateId],
    });

    expect(created.id).toBe('2026-2027');
    expect(created.annualFees).toHaveLength(1);
    expect(created.annualFees[0]).toMatchObject({
      name: 'Bảo hiểm',
      amount: 100000,
      assignedMonthKey: '2026-09',
      source: 'TEMPLATE',
      sourceTemplateId: annualTemplateId,
    });

    const firstMonth = created.months['2026-09'];
    expect(firstMonth).toBeDefined();
    expect(Object.keys(created.months)).toEqual(['2026-09']);
    expect(firstMonth.items).toHaveLength(2);
    expect(firstMonth.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MONTHLY_FIXED',
          name: 'Vệ sinh',
          amount: 12000,
          sourceTemplateId: fixedTemplateId,
        }),
        expect.objectContaining({
          type: 'DAILY',
          name: 'Ăn bán trú',
          unitPrice: 20000,
          sourceTemplateId: dailyTemplateId,
        }),
      ]),
    );
  });

  it('rejects invalid and duplicate school year', async () => {
    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2028',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [],
      firstMonthTemplateIds: [],
    });

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects selected inactive/missing/wrong-type templates', async () => {
    data.templates[0].active = false;

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [annualTemplateId],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [annualTemplateId],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps year snapshots isolated from later template edits', async () => {
    const created = await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [annualTemplateId],
      firstMonthTemplateIds: [fixedTemplateId],
    });
    const snapshot = structuredClone(created);

    const fixed = data.templates.find((item) => item.id === fixedTemplateId);
    if (fixed?.type === 'MONTHLY_FIXED') {
      fixed.defaultAmount = 999999;
      fixed.name = 'Đã đổi';
    }

    expect(data.schoolYears[0]).toEqual(snapshot);
  });

  it('reopens both paid months when moving an annual item between them after confirmation', async () => {
    const year = await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [],
      firstMonthTemplateIds: [],
    });
    year.months['2026-10'] = {
      monthKey: '2026-10',
      paymentStatus: 'PAID',
      attendanceDates: [],
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    year.months['2026-09'].paymentStatus = 'PAID';
    data.schoolYears[0] = structuredClone(year);

    const added = await service.createAnnualItem(childId, '2026-2027', {
      name: 'Đồng phục',
      amount: 250000,
      assignedMonthKey: '2026-09',
      confirmReopenPaidMonth: true,
    });

    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';
    data.schoolYears[0].months['2026-10'].paymentStatus = 'PAID';

    await expect(
      service.updateAnnualItem(childId, '2026-2027', added.id, {
        name: 'Đồng phục',
        amount: 250000,
        assignedMonthKey: '2026-10',
        confirmReopenPaidMonth: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await service.updateAnnualItem(childId, '2026-2027', added.id, {
      name: 'Đồng phục',
      amount: 250000,
      assignedMonthKey: '2026-10',
      confirmReopenPaidMonth: true,
    });

    expect(data.schoolYears[0].months['2026-09'].paymentStatus).toBe('UNPAID');
    expect(data.schoolYears[0].months['2026-10'].paymentStatus).toBe('UNPAID');
  });

  it('validates school-year metadata branches and supports a Dec-to-Jan range', async () => {
    await expect(
      service.createSchoolYear(childId, {
        id: 'bad',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: 'bad',
        endMonthKey: '2027-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: '2027-05',
        endMonthKey: '2026-09',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createSchoolYear(childId, {
        id: '2026-2027',
        startMonthKey: '2025-12',
        endMonthKey: '2026-05',
        annualTemplateIds: [],
        firstMonthTemplateIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const created = await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-12',
      endMonthKey: '2027-01',
      annualTemplateIds: [annualTemplateId],
      firstMonthTemplateIds: [],
    });

    expect(created.startMonthKey).toBe('2026-12');
    expect(created.endMonthKey).toBe('2027-01');
    expect(created.annualFees[0].assignedMonthKey).toBe('2026-12');
  });

  it.each([
    [{ name: '', amount: 1, assignedMonthKey: '2026-09' }],
    [{ name: 'x'.repeat(121), amount: 1, assignedMonthKey: '2026-09' }],
    [{ name: 'x', amount: -1, assignedMonthKey: '2026-09' }],
    [{ name: 'x', amount: 1.5, assignedMonthKey: '2026-09' }],
    [{ name: 'x', amount: 1, assignedMonthKey: 'bad' }],
  ])('rejects invalid annual item input %#', async (input) => {
    await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [],
      firstMonthTemplateIds: [],
    });

    await expect(
      service.createAnnualItem(childId, '2026-2027', input as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects annual item operations for missing year, outside month and missing item', async () => {
    await expect(
      service.createAnnualItem(childId, '2025-2026', {
        name: 'x',
        amount: 1,
        assignedMonthKey: '2026-09',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [],
      firstMonthTemplateIds: [],
    });

    await expect(
      service.createAnnualItem(childId, '2026-2027', {
        name: 'x',
        amount: 1,
        assignedMonthKey: '2027-06',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateAnnualItem(childId, '2026-2027', 'missing', {
        name: 'x',
        amount: 1,
        assignedMonthKey: '2026-09',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.deleteAnnualItem(childId, '2026-2027', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires confirmation when adding/deleting annual fee changes a paid month total', async () => {
    await service.createSchoolYear(childId, {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [],
      firstMonthTemplateIds: [],
    });
    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';

    await expect(
      service.createAnnualItem(childId, '2026-2027', {
        name: 'Đồng phục',
        amount: 250000,
        assignedMonthKey: '2026-09',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const created = await service.createAnnualItem(childId, '2026-2027', {
      name: 'Đồng phục',
      amount: 250000,
      assignedMonthKey: '2026-09',
      confirmReopenPaidMonth: true,
    });
    expect(data.schoolYears[0].months['2026-09'].paymentStatus).toBe('UNPAID');

    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';
    await expect(
      service.deleteAnnualItem(childId, '2026-2027', created.id, false),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.deleteAnnualItem(childId, '2026-2027', created.id, true),
    ).resolves.toBe(created.id);
    expect(data.schoolYears[0].months['2026-09'].paymentStatus).toBe('UNPAID');
  });

  it('maps repository failures from mutation', async () => {
    const input = {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualTemplateIds: [],
      firstMonthTemplateIds: [],
    };

    repository.mutateChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('INVALID_CHILD_ID', 'invalid'),
    );
    await expect(
      service.createSchoolYear(childId, input),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.mutateChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('CHILD_NOT_FOUND', 'missing'),
    );
    await expect(
      service.createSchoolYear(childId, input),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.mutateChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('SCHOOL_FEES_DATA_WRITE_FAILED', 'write'),
    );
    await expect(
      service.createSchoolYear(childId, input),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    repository.mutateChild.mockRejectedValueOnce(new Error('unexpected'));
    await expect(
      service.createSchoolYear(childId, input),
    ).rejects.toThrow('unexpected');
  });

});
