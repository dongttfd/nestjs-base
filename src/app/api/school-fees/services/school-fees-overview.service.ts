import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { MonthSummaryData } from '@/app/api/school-fees/entities/month-summary.entity';
import type { SchoolYear } from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesCalculatorService } from './school-fees-calculator.service';

export interface SchoolYearOverview {
  id: string;
  startMonthKey: string;
  endMonthKey: string;
  totalAmount: number;
  annualTotalAmount: number;
  months: MonthSummaryData[];
}

@Injectable()
export class SchoolFeesOverviewService {
  constructor(
    private readonly repository: JsonSchoolFeesRepository,
    private readonly calculator: SchoolFeesCalculatorService,
  ) {}

  async listOverviews(childId: string): Promise<SchoolYearOverview[]> {
    return this.withRepositoryErrors(async () => {
      const data = await this.repository.readChild(childId);

      return data.schoolYears
        .map((year) => this.buildOverview(year))
        .sort((a, b) => b.id.localeCompare(a.id));
    });
  }

  async getOverview(
    childId: string,
    schoolYearId: string,
  ): Promise<SchoolYearOverview> {
    this.validateSchoolYearId(schoolYearId);

    return this.withRepositoryErrors(async () => {
      const data = await this.repository.readChild(childId);
      const year = data.schoolYears.find((item) => item.id === schoolYearId);

      if (!year) {
        this.throwNotFound('SCHOOL_YEAR_NOT_FOUND', 'Không tìm thấy năm học.');
      }

      return this.buildOverview(year);
    });
  }

  private buildOverview(year: SchoolYear): SchoolYearOverview {
    const annualTotalAmount = year.annualFees.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    let monthlyOnlyTotal = 0;
    const months = this.enumerateMonthKeys(
      year.startMonthKey,
      year.endMonthKey,
    ).map<MonthSummaryData>((monthKey) => {
      const month = year.months[monthKey];

      if (!month) {
        return { monthKey, created: false };
      }

      const detail = this.calculator.buildMonthDetail(year, month);
      monthlyOnlyTotal += detail.monthlyItems.reduce(
        (sum, item) => sum + item.calculatedAmount,
        0,
      );

      return {
        monthKey,
        created: true,
        paymentStatus: detail.paymentStatus,
        attendanceCount: detail.attendanceCount,
        totalAmount: detail.totalAmount,
        canMarkPaid: detail.canMarkPaid,
      };
    });

    return {
      id: year.id,
      startMonthKey: year.startMonthKey,
      endMonthKey: year.endMonthKey,
      totalAmount: annualTotalAmount + monthlyOnlyTotal,
      annualTotalAmount,
      months,
    };
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

  private validateSchoolYearId(value: string): void {
    const match = /^(\d{4})-(\d{4})$/.exec(value);

    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      this.throwBadRequest('INVALID_SCHOOL_YEAR', 'Năm học không hợp lệ.');
    }
  }

  private async withRepositoryErrors<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

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
  }

  private throwBadRequest(errorCode: string, message: string): never {
    throw new BadRequestException({ statusCode: 400, errorCode, message });
  }

  private throwNotFound(errorCode: string, message: string): never {
    throw new NotFoundException({ statusCode: 404, errorCode, message });
  }
}
