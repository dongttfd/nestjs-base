import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  FeeTemplate,
  SchoolFeesDataFile,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesTemplateEligibilityService } from './school-fees-template-eligibility.service';
import { SchoolFeesTemplateService } from './school-fees-template.service';

const childId = '550e8400-e29b-41d4-a716-446655440000';
const now = '2026-09-21T00:00:00.000Z';

const buildData = (): SchoolFeesDataFile => ({
  schemaVersion: 1,
  childId,
  status: 'NEW',
  defaultsSeedVersion: 2,
  templates: [],
  schoolYears: [
    {
      id: '2026-2027',
      startMonthKey: '2026-09',
      endMonthKey: '2027-05',
      annualFees: [
        {
          id: 'annual-snapshot-1',
          name: 'Đồng phục snapshot',
          amount: 250000,
          assignedMonthKey: '2026-09',
          source: 'TEMPLATE',
          sourceTemplateId: 'template-old',
          createdAt: now,
          updatedAt: now,
        },
      ],
      months: {
        '2026-09': {
          monthKey: '2026-09',
          paymentStatus: 'UNPAID',
          attendanceDates: [],
          items: [
            {
              id: 'monthly-snapshot-1',
              type: 'MONTHLY_FIXED',
              name: 'Vệ sinh snapshot',
              amount: 12000,
              source: 'TEMPLATE',
              sourceTemplateId: 'template-old',
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
});

describe('SchoolFeesTemplateService', () => {
  let data: SchoolFeesDataFile;
  let service: SchoolFeesTemplateService;
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

    service = new SchoolFeesTemplateService(
      repository as unknown as JsonSchoolFeesRepository,
      new SchoolFeesTemplateEligibilityService(),
    );
  });

  it('creates, lists, updates active state and deletes monthly fixed template', async () => {
    const created = await service.create(childId, {
      type: 'MONTHLY_FIXED',
      name: 'Vệ sinh',
      active: true,
      defaultAmount: 12000,
    });

    expect(created.type).toBe('MONTHLY_FIXED');
    expect((created as Extract<FeeTemplate, { type: 'MONTHLY_FIXED' }>).defaultAmount)
      .toBe(12000);

    const listed = await service.list(childId, 'MONTHLY_FIXED');
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe('Vệ sinh');

    const updated = await service.update(childId, created.id, {
      type: 'MONTHLY_FIXED',
      name: 'Vệ sinh',
      active: false,
      defaultAmount: 15000,
    });

    expect(updated.active).toBe(false);
    expect((updated as Extract<FeeTemplate, { type: 'MONTHLY_FIXED' }>).defaultAmount)
      .toBe(15000);

    await expect(service.delete(childId, created.id)).resolves.toEqual(created.id);
    await expect(service.update(childId, created.id, {
      type: 'MONTHLY_FIXED',
      name: 'missing',
      active: true,
      defaultAmount: 1,
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates annual and daily templates with exact fields', async () => {
    const annual = await service.create(childId, {
      type: 'ANNUAL',
      name: 'Bảo hiểm',
      active: true,
      defaultAmount: 100000,
      defaultMonthOffset: 1,
    });
    const daily = await service.create(childId, {
      type: 'DAILY',
      name: 'Ăn bán trú',
      active: true,
      priceByMonth: {
        '2026-09': 20000,
      },
    });

    expect(annual.type).toBe('ANNUAL');
    expect(daily.type).toBe('DAILY');
    expect(
      (daily as Extract<FeeTemplate, { type: 'DAILY' }>).priceByMonth['2026-09'],
    ).toBe(20000);
    expect(
      Object.prototype.hasOwnProperty.call(
        (daily as Extract<FeeTemplate, { type: 'DAILY' }>).priceByMonth,
        '2026-10',
      ),
    ).toBe(false);
  });

  it('creates custom templates with null condition and preserves system-managed condition on update', async () => {
    const custom = await service.create(childId, {
      type: 'MONTHLY_FIXED',
      name: 'Tự tạo',
      active: true,
      defaultAmount: 10000,
    });

    expect(custom.applicableChildStatus).toBeNull();

    data.templates.push({
      id: 'system-new-template',
      name: 'Đồ dùng bán trú - trẻ mới',
      type: 'ANNUAL',
      active: true,
      applicableChildStatus: 'NEW',
      defaultAmount: 250000,
      defaultMonthOffset: 0,
      createdAt: now,
      updatedAt: now,
    });

    const updated = await service.update(
      childId,
      'system-new-template',
      {
        type: 'ANNUAL',
        name: 'Đồ dùng bán trú - trẻ mới cập nhật',
        active: false,
        defaultAmount: 260000,
        defaultMonthOffset: 0,
        applicableChildStatus: 'RETURNING',
      } as never,
    );

    expect(updated).toMatchObject({
      applicableChildStatus: 'NEW',
      active: false,
      defaultAmount: 260000,
    });
  });

  it('filters active eligible templates only when eligibleForChild is requested', async () => {
    data.status = 'NEW';
    data.templates = [
      {
        id: 'new-active',
        name: 'NEW active',
        type: 'ANNUAL',
        active: true,
        applicableChildStatus: 'NEW',
        defaultAmount: 1,
        defaultMonthOffset: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'returning-active',
        name: 'RETURNING active',
        type: 'ANNUAL',
        active: true,
        applicableChildStatus: 'RETURNING',
        defaultAmount: 1,
        defaultMonthOffset: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'neutral-active',
        name: 'Neutral active',
        type: 'ANNUAL',
        active: true,
        applicableChildStatus: null,
        defaultAmount: 1,
        defaultMonthOffset: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'new-inactive',
        name: 'NEW inactive',
        type: 'ANNUAL',
        active: false,
        applicableChildStatus: 'NEW',
        defaultAmount: 1,
        defaultMonthOffset: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await expect(service.list(childId, 'ANNUAL', true)).resolves.toEqual([
      expect.objectContaining({ id: 'new-active' }),
      expect.objectContaining({ id: 'neutral-active' }),
    ]);
    await expect(service.list(childId, 'ANNUAL')).resolves.toHaveLength(4);
  });

  it('rejects invalid amounts and invalid daily month keys', async () => {
    await expect(
      service.create(childId, {
        type: 'MONTHLY_FIXED',
        name: 'Sai',
        active: true,
        defaultAmount: -1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(childId, {
        type: 'DAILY',
        name: 'Sai tháng',
        active: true,
        priceByMonth: {
          '2026-13': 20000,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(childId, {
        type: 'DAILY',
        name: 'Sai giá',
        active: true,
        priceByMonth: {
          '2026-09': 12.5,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleting a template never cascades into existing snapshots', async () => {
    const template = await service.create(childId, {
      type: 'MONTHLY_FIXED',
      name: 'Vệ sinh',
      active: true,
      defaultAmount: 12000,
    });
    const before = structuredClone(data.schoolYears);

    await service.delete(childId, template.id);

    expect(data.schoolYears).toEqual(before);
  });

  it('lists all templates and rejects an invalid filter type', async () => {
    await service.create(childId, {
      type: 'ANNUAL',
      name: 'Bảo hiểm',
      active: true,
      defaultAmount: 100000,
      defaultMonthOffset: 0,
    });
    await service.create(childId, {
      type: 'DAILY',
      name: 'Ăn',
      active: true,
      priceByMonth: {},
    });

    await expect(service.list(childId)).resolves.toHaveLength(2);
    await expect(
      service.list(childId, 'INVALID' as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    [{ type: 'INVALID', name: 'x', active: true }],
    [{ type: 'MONTHLY_FIXED', name: '', active: true, defaultAmount: 1 }],
    [{ type: 'MONTHLY_FIXED', name: 'x'.repeat(121), active: true, defaultAmount: 1 }],
    [{ type: 'MONTHLY_FIXED', name: 'x', active: 'yes', defaultAmount: 1 }],
    [{ type: 'ANNUAL', name: 'x', active: true, defaultAmount: 1, defaultMonthOffset: -1 }],
    [{ type: 'ANNUAL', name: 'x', active: true, defaultAmount: 1, defaultMonthOffset: 0, priceByMonth: {} }],
    [{ type: 'MONTHLY_FIXED', name: 'x', active: true, defaultAmount: 1, defaultMonthOffset: 0 }],
    [{ type: 'DAILY', name: 'x', active: true, defaultAmount: 1, priceByMonth: {} }],
    [{ type: 'DAILY', name: 'x', active: true, priceByMonth: [] }],
  ])('rejects invalid discriminated template input %#', async (input) => {
    await expect(
      service.create(childId, input as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports zero-valued annual/fixed/daily template data and rejects deleting missing template', async () => {
    await expect(
      service.create(childId, {
        type: 'ANNUAL',
        name: 'Annual zero',
        active: false,
        defaultAmount: 0,
        defaultMonthOffset: 0,
      }),
    ).resolves.toMatchObject({ type: 'ANNUAL', defaultAmount: 0 });

    await expect(
      service.create(childId, {
        type: 'MONTHLY_FIXED',
        name: 'Fixed zero',
        active: true,
        defaultAmount: 0,
      }),
    ).resolves.toMatchObject({ type: 'MONTHLY_FIXED', defaultAmount: 0 });

    await expect(
      service.create(childId, {
        type: 'DAILY',
        name: 'Daily zero',
        active: true,
        priceByMonth: { '2026-09': 0 },
      }),
    ).resolves.toMatchObject({
      type: 'DAILY',
      priceByMonth: { '2026-09': 0 },
    });

    await expect(
      service.delete(childId, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps repository failures for list operations', async () => {
    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('INVALID_CHILD_ID', 'invalid'),
    );
    await expect(service.list(childId)).rejects.toBeInstanceOf(BadRequestException);

    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('CHILD_NOT_FOUND', 'missing'),
    );
    await expect(service.list(childId)).rejects.toBeInstanceOf(NotFoundException);

    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('SCHOOL_FEES_DATA_READ_FAILED', 'broken'),
    );
    await expect(service.list(childId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );

    repository.readChild.mockRejectedValueOnce(new Error('unexpected'));
    await expect(service.list(childId)).rejects.toThrow('unexpected');
  });

});
