import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SchoolFeesDataFile } from './models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from './repositories/json-school-fees.repository';
import { SchoolFeesService } from './school-fees.service';
import { SchoolFeesCalculatorService } from './services/school-fees-calculator.service';

const now = '2026-09-21T00:00:00.000Z';
const childId = '550e8400-e29b-41d4-a716-446655440000';

const createData = (): SchoolFeesDataFile => ({
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
      annualFees: [],
      months: {
        '2026-09': {
          monthKey: '2026-09',
          paymentStatus: 'UNPAID',
          attendanceDates: [],
          items: [
            {
              id: 'daily-1',
              type: 'DAILY',
              name: 'Ăn bán trú',
              unitPrice: 20000,
              source: 'CUSTOM',
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

describe('SchoolFeesService month flows', () => {
  let data: SchoolFeesDataFile;
  let service: SchoolFeesService;
  let repository: jest.Mocked<Pick<JsonSchoolFeesRepository, 'readChild' | 'mutateChild'>>;

  beforeEach(() => {
    data = createData();
    repository = {
      readChild: jest.fn(async (requestedChildId: string) => {
        expect(requestedChildId).toBe(childId);

        return structuredClone(data);
      }),
      mutateChild: jest.fn(async (_childId, mutator) => {
        data = await mutator(structuredClone(data));

        return structuredClone(data);
      }),
    };

    service = new SchoolFeesService(
      repository as unknown as JsonSchoolFeesRepository,
      new SchoolFeesCalculatorService(),
    );
  });

  it('updates and sorts attendance dates', async () => {
    const detail = await service.updateAttendance(
      childId,
      '2026-2027',
      '2026-09',
      ['2026-09-03', '2026-09-01'],
      false,
    );

    expect(detail.attendanceDates).toEqual(['2026-09-01', '2026-09-03']);
    expect(detail.totalAmount).toBe(40000);
  });

  it('requires confirmation before total-changing mutation on PAID month', async () => {
    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';

    await expect(
      service.updateAttendance(
        childId,
        '2026-2027',
        '2026-09',
        ['2026-09-01'],
        false,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(data.schoolYears[0].months['2026-09'].attendanceDates).toEqual([]);
  });

  it('reopens PAID month after confirmed mutation changes total', async () => {
    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';

    const detail = await service.updateAttendance(
      childId,
      '2026-2027',
      '2026-09',
      ['2026-09-01'],
      true,
    );

    expect(detail.paymentStatus).toBe('UNPAID');
    expect(detail.totalAmount).toBe(20000);
  });

  it('keeps PAID when confirmed mutation does not change total', async () => {
    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';

    const detail = await service.updateAttendance(
      childId,
      '2026-2027',
      '2026-09',
      [],
      true,
    );

    expect(detail.paymentStatus).toBe('PAID');
  });

  it('blocks PAID when a daily item has no price', async () => {
    data.schoolYears[0].months['2026-09'].items[0] = {
      ...data.schoolYears[0].months['2026-09'].items[0],
      type: 'DAILY',
      unitPrice: null,
    };

    await expect(
      service.updatePaymentStatus(
        childId,
        '2026-2027',
        '2026-09',
        'PAID',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('creates, updates and deletes a month-local item without touching templates', async () => {
    const created = await service.createMonthlyItem(
      childId,
      '2026-2027',
      '2026-09',
      {
        type: 'MONTHLY_FIXED',
        name: 'Vệ sinh',
        amount: 12000,
        confirmReopenPaidMonth: false,
      },
    );

    const item = created.monthlyItems.find((entry) => entry.name === 'Vệ sinh');
    expect(item?.calculatedAmount).toBe(12000);
    expect(data.templates).toEqual([]);

    const updated = await service.updateMonthlyItem(
      childId,
      '2026-2027',
      '2026-09',
      item!.id,
      {
        type: 'MONTHLY_FIXED',
        name: 'Vệ sinh',
        amount: 15000,
        confirmReopenPaidMonth: false,
      },
    );
    expect(
      updated.monthlyItems.find((entry) => entry.id === item!.id)?.calculatedAmount,
    ).toBe(15000);

    const deleted = await service.deleteMonthlyItem(
      childId,
      '2026-2027',
      '2026-09',
      item!.id,
      false,
    );
    expect(deleted.monthlyItems.some((entry) => entry.id === item!.id)).toBe(false);
  });

  it('reads detail and rejects invalid year, missing year, invalid/outside month and uncreated month', async () => {
    await expect(
      service.getMonthDetail(childId, '2026-2027', '2026-09'),
    ).resolves.toMatchObject({ monthKey: '2026-09' });

    await expect(
      service.getMonthDetail(childId, '2026-2028', '2026-09'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getMonthDetail(childId, '2025-2026', '2026-09'),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.getMonthDetail(childId, '2026-2027', 'bad-month'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getMonthDetail(childId, '2026-2027', '2027-06'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getMonthDetail(childId, '2026-2027', '2026-10'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['not-a-date'],
    ['2026-10-01'],
    ['2026-09-31'],
  ])('rejects invalid attendance date %s', async (date) => {
    await expect(
      service.updateAttendance(
        childId,
        '2026-2027',
        '2026-09',
        [date],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a daily custom item and can mark a valid month paid/unpaid', async () => {
    const created = await service.createMonthlyItem(
      childId,
      '2026-2027',
      '2026-09',
      {
        type: 'DAILY',
        name: 'Xe đưa đón',
        unitPrice: 5000,
      },
    );

    expect(
      created.monthlyItems.find((item) => item.name === 'Xe đưa đón'),
    ).toMatchObject({
      type: 'DAILY',
      unitPrice: 5000,
    });

    const paid = await service.updatePaymentStatus(
      childId,
      '2026-2027',
      '2026-09',
      'PAID',
    );
    expect(paid.paymentStatus).toBe('PAID');

    const unpaid = await service.updatePaymentStatus(
      childId,
      '2026-2027',
      '2026-09',
      'UNPAID',
    );
    expect(unpaid.paymentStatus).toBe('UNPAID');
  });

  it('rejects update/delete for missing monthly item', async () => {
    await expect(
      service.updateMonthlyItem(
        childId,
        '2026-2027',
        '2026-09',
        'missing',
        {
          type: 'MONTHLY_FIXED',
          name: 'missing',
          amount: 1,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.deleteMonthlyItem(
        childId,
        '2026-2027',
        '2026-09',
        'missing',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires confirmation when a paid zero-price daily item becomes missing-price even if total is unchanged', async () => {
    data.schoolYears[0].months['2026-09'].paymentStatus = 'PAID';
    data.schoolYears[0].months['2026-09'].items[0] = {
      ...data.schoolYears[0].months['2026-09'].items[0],
      type: 'DAILY',
      unitPrice: 0,
    };

    await expect(
      service.updateMonthlyItem(
        childId,
        '2026-2027',
        '2026-09',
        'daily-1',
        {
          type: 'DAILY',
          name: 'Ăn bán trú',
          unitPrice: null,
          confirmReopenPaidMonth: false,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const confirmed = await service.updateMonthlyItem(
      childId,
      '2026-2027',
      '2026-09',
      'daily-1',
      {
        type: 'DAILY',
        name: 'Ăn bán trú',
        unitPrice: null,
        confirmReopenPaidMonth: true,
      },
    );
    expect(confirmed.paymentStatus).toBe('UNPAID');
    expect(confirmed.canMarkPaid).toBe(false);
  });

  it('maps repository errors and preserves unexpected errors', async () => {
    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('INVALID_CHILD_ID', 'invalid'),
    );
    await expect(
      service.getMonthDetail(childId, '2026-2027', '2026-09'),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('CHILD_NOT_FOUND', 'missing'),
    );
    await expect(
      service.getMonthDetail(childId, '2026-2027', '2026-09'),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository.readChild.mockRejectedValueOnce(
      new SchoolFeesRepositoryError('SCHOOL_FEES_DATA_READ_FAILED', 'broken'),
    );
    await expect(
      service.getMonthDetail(childId, '2026-2027', '2026-09'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    repository.readChild.mockRejectedValueOnce(new Error('unexpected'));
    await expect(
      service.getMonthDetail(childId, '2026-2027', '2026-09'),
    ).rejects.toThrow('unexpected');
  });

});
