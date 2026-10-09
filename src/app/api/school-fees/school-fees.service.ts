import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ChildContext,
  MonthlyFeeItem,
  MonthlyFeePeriod,
  PaymentStatus,
  SchoolFeesDataFile,
  SchoolYear,
} from './models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from './repositories/json-school-fees.repository';
import {
  MonthDetailView,
  SchoolFeesCalculatorService,
} from './services/school-fees-calculator.service';

export interface MonthlyItemMutationInput {
  type: 'MONTHLY_FIXED' | 'DAILY';
  name: string;
  amount?: number;
  unitPrice?: number | null;
  confirmReopenPaidMonth?: boolean;
}

@Injectable()
export class SchoolFeesService {
  constructor(
    private readonly repository: JsonSchoolFeesRepository,
    private readonly calculator: SchoolFeesCalculatorService,
  ) {}

  async resolveDefaultChild(): Promise<ChildContext> {
    return this.withRepositoryErrors(() => this.repository.bootstrapDefaultChild());
  }

  async resolveChildContext(childId: string): Promise<ChildContext> {
    return this.withRepositoryErrors(() =>
      this.repository.resolveChildContext(childId),
    );
  }

  async getMonthDetail(
    childId: string,
    schoolYearId: string,
    monthKey: string,
  ): Promise<MonthDetailView> {
    return this.withRepositoryErrors(async () => {
      const data = await this.repository.readChild(childId);
      const { schoolYear, month } = this.requireMonth(data, schoolYearId, monthKey);

      return this.calculator.buildMonthDetail(schoolYear, month);
    });
  }

  async updateAttendance(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    attendanceDates: string[],
    confirmReopenPaidMonth = false,
  ): Promise<MonthDetailView> {
    const normalized = [...new Set(attendanceDates)].sort();
    this.validateAttendanceDates(monthKey, normalized);

    return this.mutateMonth(
      childId,
      schoolYearId,
      monthKey,
      confirmReopenPaidMonth,
      (month) => {
        month.attendanceDates = normalized;
        month.updatedAt = new Date().toISOString();
      },
    );
  }

  async createMonthlyItem(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    input: MonthlyItemMutationInput,
  ): Promise<MonthDetailView> {
    return this.mutateMonth(
      childId,
      schoolYearId,
      monthKey,
      input.confirmReopenPaidMonth ?? false,
      (month) => {
        const timestamp = new Date().toISOString();
        month.items.push(this.buildMonthlyItem(input, randomUUID(), timestamp));
        month.updatedAt = timestamp;
      },
    );
  }

  async updateMonthlyItem(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    itemId: string,
    input: MonthlyItemMutationInput,
  ): Promise<MonthDetailView> {
    return this.mutateMonth(
      childId,
      schoolYearId,
      monthKey,
      input.confirmReopenPaidMonth ?? false,
      (month) => {
        const index = month.items.findIndex((item) => item.id === itemId);

        if (index < 0) {
          this.throwNotFound('FEE_ITEM_NOT_FOUND', 'Không tìm thấy khoản thu.');
        }

        const current = month.items[index];
        const timestamp = new Date().toISOString();
        const replacement = this.buildMonthlyItem(
          input,
          current.id,
          current.createdAt,
          current.source,
          current.sourceTemplateId,
          timestamp,
        );
        month.items[index] = replacement;
        month.updatedAt = timestamp;
      },
    );
  }

  async deleteMonthlyItem(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    itemId: string,
    confirmReopenPaidMonth = false,
  ): Promise<MonthDetailView> {
    return this.mutateMonth(
      childId,
      schoolYearId,
      monthKey,
      confirmReopenPaidMonth,
      (month) => {
        const index = month.items.findIndex((item) => item.id === itemId);

        if (index < 0) {
          this.throwNotFound('FEE_ITEM_NOT_FOUND', 'Không tìm thấy khoản thu.');
        }

        month.items.splice(index, 1);
        month.updatedAt = new Date().toISOString();
      },
    );
  }

  async updatePaymentStatus(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    status: PaymentStatus,
  ): Promise<MonthDetailView> {
    return this.withRepositoryErrors(async () => {
      const result = await this.repository.mutateChild(childId, (data) => {
        const { schoolYear, month } = this.requireMonth(
          data,
          schoolYearId,
          monthKey,
        );

        if (status === 'PAID') {
          const current = this.calculator.buildMonthDetail(schoolYear, month);

          if (!current.canMarkPaid) {
            this.throwUnprocessable(
              'DAILY_PRICE_MISSING',
              'Không thể đánh dấu Đã nộp khi còn khoản theo ngày chưa có đơn giá.',
            );
          }
        }

        month.paymentStatus = status;
        const timestamp = new Date().toISOString();
        month.updatedAt = timestamp;
        schoolYear.updatedAt = timestamp;

        return data;
      });
      const { schoolYear, month } = this.requireMonth(
        result,
        schoolYearId,
        monthKey,
      );

      return this.calculator.buildMonthDetail(schoolYear, month);
    });
  }

  private async mutateMonth(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    confirmReopenPaidMonth: boolean,
    mutate: (month: MonthlyFeePeriod, schoolYear: SchoolYear) => void,
  ): Promise<MonthDetailView> {
    return this.withRepositoryErrors(async () => {
      const result = await this.repository.mutateChild(childId, (data) => {
        const { schoolYear, month } = this.requireMonth(
          data,
          schoolYearId,
          monthKey,
        );
        const wasPaid = month.paymentStatus === 'PAID';
        const totalBefore = this.calculator.calculateMonthTotal(schoolYear, month);

        mutate(month, schoolYear);

        const afterDetail = this.calculator.buildMonthDetail(schoolYear, month);
        const totalChanged = totalBefore !== afterDetail.totalAmount;
        const mustReopen = wasPaid && (totalChanged || !afterDetail.canMarkPaid);

        if (mustReopen && !confirmReopenPaidMonth) {
          this.throwConflict(
            'PAID_MONTH_CONFIRMATION_REQUIRED',
            totalChanged
              ? 'Thay đổi này làm tổng tiền của tháng Đã nộp thay đổi.'
              : 'Thay đổi này làm tháng Đã nộp không còn đủ điều kiện thanh toán.',
          );
        }

        if (mustReopen) {
          month.paymentStatus = 'UNPAID';
        }

        schoolYear.updatedAt = new Date().toISOString();

        return data;
      });

      const { schoolYear, month } = this.requireMonth(
        result,
        schoolYearId,
        monthKey,
      );

      return this.calculator.buildMonthDetail(schoolYear, month);
    });
  }

  private requireMonth(
    data: SchoolFeesDataFile,
    schoolYearId: string,
    monthKey: string,
  ): { schoolYear: SchoolYear; month: MonthlyFeePeriod } {
    this.validateSchoolYearId(schoolYearId);
    const schoolYear = data.schoolYears.find((year) => year.id === schoolYearId);

    if (!schoolYear) {
      this.throwNotFound('SCHOOL_YEAR_NOT_FOUND', 'Không tìm thấy năm học.');
    }

    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) ||
      monthKey < schoolYear.startMonthKey ||
      monthKey > schoolYear.endMonthKey
    ) {
      this.throwBadRequest(
        'MONTH_OUTSIDE_SCHOOL_YEAR',
        'Tháng không thuộc phạm vi năm học.',
      );
    }

    const month = schoolYear.months[monthKey];

    if (!month) {
      this.throwNotFound('MONTH_NOT_CREATED', 'Kỳ tháng chưa được tạo.');
    }

    return { schoolYear, month };
  }

  private validateSchoolYearId(schoolYearId: string): void {
    const match = /^(\d{4})-(\d{4})$/.exec(schoolYearId);

    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      this.throwBadRequest('INVALID_SCHOOL_YEAR', 'Năm học không hợp lệ.');
    }
  }

  private validateAttendanceDates(monthKey: string, dates: string[]): void {
    for (const date of dates) {
      const parsed = new Date(`${date}T00:00:00Z`);
      const isExactCalendarDate =
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date;

      if (
        !/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date) ||
        date.slice(0, 7) !== monthKey ||
        !isExactCalendarDate
      ) {
        this.throwBadRequest(
          'INVALID_ATTENDANCE_DATE',
          'Ngày đi học phải thuộc đúng kỳ tháng.',
        );
      }
    }
  }

  private buildMonthlyItem(
    input: MonthlyItemMutationInput,
    id: string,
    createdAt: string,
    source: MonthlyFeeItem['source'] = 'CUSTOM',
    sourceTemplateId?: string,
    updatedAt = createdAt,
  ): MonthlyFeeItem {
    const common = {
      id,
      name: input.name.trim(),
      source,
      sourceTemplateId,
      createdAt,
      updatedAt,
    };

    if (input.type === 'MONTHLY_FIXED') {
      return {
        ...common,
        type: 'MONTHLY_FIXED',
        amount: input.amount as number,
      };
    }

    return {
      ...common,
      type: 'DAILY',
      unitPrice: input.unitPrice as number | null,
    };
  }

  private async withRepositoryErrors<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.rethrowRepositoryError(error);
    }
  }

  private rethrowRepositoryError(error: unknown): never {
    if (!(error instanceof SchoolFeesRepositoryError)) {
      throw error;
    }

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

  private throwBadRequest(errorCode: string, message: string): never {
    throw new BadRequestException({ statusCode: 400, errorCode, message });
  }

  private throwNotFound(errorCode: string, message: string): never {
    throw new NotFoundException({ statusCode: 404, errorCode, message });
  }

  private throwConflict(errorCode: string, message: string): never {
    throw new ConflictException({ statusCode: 409, errorCode, message });
  }

  private throwUnprocessable(errorCode: string, message: string): never {
    throw new UnprocessableEntityException({
      statusCode: 422,
      errorCode,
      message,
    });
  }
}
