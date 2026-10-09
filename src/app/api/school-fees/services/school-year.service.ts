import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AnnualFeeTemplate,
  ChildStatus,
  FeeTemplate,
  MonthlyFeePeriod,
  SchoolFeesDataFile,
  SchoolYear,
  SchoolYearFeeItem,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesCalculatorService } from './school-fees-calculator.service';
import { SchoolFeesSnapshotService } from './school-fees-snapshot.service';
import {
  SchoolFeesTemplateEligibilityError,
  SchoolFeesTemplateEligibilityService,
} from './school-fees-template-eligibility.service';

export interface CreateSchoolYearInput {
  id: string;
  startMonthKey: string;
  endMonthKey: string;
  annualTemplateIds: string[];
  firstMonthTemplateIds: string[];
}

export interface AnnualFeeItemInput {
  name: string;
  amount: number;
  assignedMonthKey: string;
  confirmReopenPaidMonth?: boolean;
}

@Injectable()
export class SchoolYearService {
  constructor(
    private readonly repository: JsonSchoolFeesRepository,
    private readonly snapshotService: SchoolFeesSnapshotService,
    private readonly calculator: SchoolFeesCalculatorService,
    private readonly eligibilityService: SchoolFeesTemplateEligibilityService,
  ) {}

  async prepareNextSchoolYear(childId: string): Promise<ChildStatus> {
    const result = await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        this.applyLifecycleGuard(data);

        return data;
      }),
    );

    return result.status;
  }

  async createSchoolYear(childId: string, input: CreateSchoolYearInput): Promise<SchoolYear> {
    this.validateSchoolYearInput(input);
    let created!: SchoolYear;

    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        if (data.schoolYears.some((year) => year.id === input.id)) {
          this.throwConflict('SCHOOL_YEAR_ALREADY_EXISTS', 'Năm học đã tồn tại.');
        }

        this.applyLifecycleGuard(data);

        const annualTemplates = this.resolveTemplates(
          data,
          input.annualTemplateIds,
          ['ANNUAL'],
        ) as AnnualFeeTemplate[];
        const firstMonthTemplates = this.resolveTemplates(
          data,
          input.firstMonthTemplateIds,
          ['MONTHLY_FIXED', 'DAILY'],
        );
        const timestamp = new Date().toISOString();
        const monthKeys = this.enumerateMonthKeys(input.startMonthKey, input.endMonthKey);

        created = {
          id: input.id,
          startMonthKey: input.startMonthKey,
          endMonthKey: input.endMonthKey,
          annualFees: annualTemplates.map((template) =>
            this.snapshotService.buildAnnualSnapshot(
              template,
              monthKeys[template.defaultMonthOffset] ?? input.startMonthKey,
              timestamp,
            ),
          ),
          months: {
            [input.startMonthKey]: this.snapshotService.buildMonthlyPeriodSnapshot(
              input.startMonthKey,
              firstMonthTemplates,
              timestamp,
            ),
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        data.schoolYears.push(created);

        return data;
      }),
    );

    return structuredClone(created);
  }

  async createAnnualItem(
    childId: string,
    schoolYearId: string,
    input: AnnualFeeItemInput,
  ): Promise<SchoolYearFeeItem> {
    this.validateAnnualItemInput(input);
    let created!: SchoolYearFeeItem;

    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        const year = this.requireSchoolYear(data, schoolYearId);
        this.assertMonthInRange(year, input.assignedMonthKey);
        const before = this.capturePaidMonthTotals(year, [input.assignedMonthKey]);
        const timestamp = new Date().toISOString();

        created = {
          id: randomUUID(),
          name: input.name.trim(),
          amount: input.amount,
          assignedMonthKey: input.assignedMonthKey,
          source: 'CUSTOM',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        year.annualFees.push(created);
        this.reopenAffectedPaidMonths(
          year,
          before,
          input.confirmReopenPaidMonth ?? false,
        );
        year.updatedAt = timestamp;

        return data;
      }),
    );

    return structuredClone(created);
  }

  async updateAnnualItem(
    childId: string,
    schoolYearId: string,
    itemId: string,
    input: AnnualFeeItemInput,
  ): Promise<SchoolYearFeeItem> {
    this.validateAnnualItemInput(input);
    let updated!: SchoolYearFeeItem;

    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        const year = this.requireSchoolYear(data, schoolYearId);
        this.assertMonthInRange(year, input.assignedMonthKey);
        const index = year.annualFees.findIndex((item) => item.id === itemId);

        if (index < 0) {
          this.throwNotFound('FEE_ITEM_NOT_FOUND', 'Không tìm thấy khoản thu năm học.');
        }

        const current = year.annualFees[index];
        const before = this.capturePaidMonthTotals(
          year,
          [...new Set([current.assignedMonthKey, input.assignedMonthKey])],
        );
        const timestamp = new Date().toISOString();

        updated = {
          ...current,
          name: input.name.trim(),
          amount: input.amount,
          assignedMonthKey: input.assignedMonthKey,
          updatedAt: timestamp,
        };
        year.annualFees[index] = updated;
        this.reopenAffectedPaidMonths(
          year,
          before,
          input.confirmReopenPaidMonth ?? false,
        );
        year.updatedAt = timestamp;

        return data;
      }),
    );

    return structuredClone(updated);
  }

  async deleteAnnualItem(
    childId: string,
    schoolYearId: string,
    itemId: string,
    confirmReopenPaidMonth = false,
  ): Promise<string> {
    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        const year = this.requireSchoolYear(data, schoolYearId);
        const index = year.annualFees.findIndex((item) => item.id === itemId);

        if (index < 0) {
          this.throwNotFound('FEE_ITEM_NOT_FOUND', 'Không tìm thấy khoản thu năm học.');
        }

        const current = year.annualFees[index];
        const before = this.capturePaidMonthTotals(year, [current.assignedMonthKey]);
        year.annualFees.splice(index, 1);
        this.reopenAffectedPaidMonths(year, before, confirmReopenPaidMonth);
        year.updatedAt = new Date().toISOString();

        return data;
      }),
    );

    return itemId;
  }

  private validateSchoolYearInput(input: CreateSchoolYearInput): void {
    const match = /^(\d{4})-(\d{4})$/.exec(input.id);

    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      this.throwBadRequest('INVALID_SCHOOL_YEAR', 'Năm học không hợp lệ.');
    }

    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startMonthKey) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.endMonthKey) ||
      input.startMonthKey > input.endMonthKey
    ) {
      this.throwBadRequest('INVALID_SCHOOL_YEAR', 'Phạm vi tháng năm học không hợp lệ.');
    }

    const firstYear = Number(match[1]);
    const secondYear = Number(match[2]);
    const startYear = Number(input.startMonthKey.slice(0, 4));
    const endYear = Number(input.endMonthKey.slice(0, 4));

    if (
      startYear < firstYear ||
      startYear > secondYear ||
      endYear < firstYear ||
      endYear > secondYear
    ) {
      this.throwBadRequest(
        'INVALID_SCHOOL_YEAR',
        'Tháng phải nằm trong hai năm của năm học.',
      );
    }
  }

  private validateAnnualItemInput(input: AnnualFeeItemInput): void {
    if (
      !input.name?.trim() ||
      input.name.trim().length > 120 ||
      !Number.isInteger(input.amount) ||
      input.amount < 0 ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.assignedMonthKey)
    ) {
      this.throwBadRequest('INVALID_ANNUAL_ITEM', 'Khoản thu năm học không hợp lệ.');
    }
  }

  private resolveTemplates(
    data: SchoolFeesDataFile,
    templateIds: string[],
    allowedTypes: FeeTemplate['type'][],
  ): FeeTemplate[] {
    for (const templateId of templateIds) {
      const template = data.templates.find((item) => item.id === templateId);

      if (!template || !template.active || !allowedTypes.includes(template.type)) {
        this.throwNotFound(
          'FEE_TEMPLATE_NOT_FOUND',
          'Template được chọn không tồn tại, không còn active hoặc sai loại.',
        );
      }
    }

    try {
      return this.eligibilityService.resolveEligibleByIds(
        data.templates,
        templateIds,
        data.status,
        allowedTypes,
      );
    } catch (error) {
      if (error instanceof SchoolFeesTemplateEligibilityError) {
        this.throwConflict(error.code, error.message);
      }

      throw error;
    }
  }

  private applyLifecycleGuard(data: SchoolFeesDataFile): void {
    if (data.status === 'NEW' && data.schoolYears.length >= 1) {
      data.status = 'RETURNING';
    }
  }

  private requireSchoolYear(data: SchoolFeesDataFile, schoolYearId: string): SchoolYear {
    const year = data.schoolYears.find((item) => item.id === schoolYearId);

    if (!year) {
      this.throwNotFound('SCHOOL_YEAR_NOT_FOUND', 'Không tìm thấy năm học.');
    }

    return year;
  }

  private assertMonthInRange(year: SchoolYear, monthKey: string): void {
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ||
      monthKey < year.startMonthKey ||
      monthKey > year.endMonthKey
    ) {
      this.throwBadRequest(
        'MONTH_OUTSIDE_SCHOOL_YEAR',
        'Tháng không thuộc phạm vi năm học.',
      );
    }
  }

  private capturePaidMonthTotals(
    year: SchoolYear,
    monthKeys: string[],
  ): Map<string, number> {
    const result = new Map<string, number>();

    for (const monthKey of monthKeys) {
      const month = year.months[monthKey];

      if (month?.paymentStatus === 'PAID') {
        result.set(monthKey, this.calculator.calculateMonthTotal(year, month));
      }
    }

    return result;
  }

  private reopenAffectedPaidMonths(
    year: SchoolYear,
    beforeTotals: Map<string, number>,
    confirmed: boolean,
  ): void {
    const changed: MonthlyFeePeriod[] = [];

    for (const [monthKey, beforeTotal] of beforeTotals) {
      const month = year.months[monthKey];

      if (
        month?.paymentStatus === 'PAID' &&
        this.calculator.calculateMonthTotal(year, month) !== beforeTotal
      ) {
        changed.push(month);
      }
    }

    if (changed.length > 0 && !confirmed) {
      this.throwConflict(
        'PAID_MONTH_CONFIRMATION_REQUIRED',
        'Thay đổi này làm tổng tiền của tháng Đã nộp thay đổi.',
      );
    }

    const timestamp = new Date().toISOString();
    for (const month of changed) {
      month.paymentStatus = 'UNPAID';
      month.updatedAt = timestamp;
    }
  }

  private enumerateMonthKeys(start: string, end: string): string[] {
    const result: string[] = [];
    let [year, month] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);

    while (year < endYear || (year === endYear && month <= endMonth)) {
      result.push(`${year}-${String(month).padStart(2, '0')}`);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    return result;
  }

  private async withRepositoryErrors<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (!(error instanceof SchoolFeesRepositoryError)) throw error;
      if (error.code === 'INVALID_CHILD_ID') {
        this.throwBadRequest(error.code, error.message);
      }
      if (error.code === 'CHILD_NOT_FOUND') {
        this.throwNotFound(error.code, error.message);
      }

      throw new InternalServerErrorException({
        statusCode: 500,
        errorCode: error.code,
        message: error.message,
      });
    }
  }

  private throwBadRequest(errorCode: string, message: string): never {
    throw new BadRequestException({ statusCode: 400, errorCode, message });
  }

  private throwNotFound(errorCode: string, message: string): never {
    throw new NotFoundException({ statusCode: 404, errorCode, message });
  }

  private throwConflict(errorCode: string, message: string): never {
    throw new ConflictException({ statusCode: 409, errorCode, message });
  }
}
