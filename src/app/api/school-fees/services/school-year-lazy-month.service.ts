import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  FeeTemplate,
  MonthlyFeePeriod,
  SchoolFeesDataFile,
  SchoolYear,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesSnapshotService } from './school-fees-snapshot.service';
import {
  SchoolFeesTemplateEligibilityError,
  SchoolFeesTemplateEligibilityService,
} from './school-fees-template-eligibility.service';

@Injectable()
export class SchoolYearLazyMonthService {
  constructor(
    private readonly repository: JsonSchoolFeesRepository,
    private readonly snapshotService: SchoolFeesSnapshotService,
    private readonly eligibilityService: SchoolFeesTemplateEligibilityService,
  ) {}

  async createMonth(
    childId: string,
    schoolYearId: string,
    monthKey: string,
    templateIds: string[],
  ): Promise<MonthlyFeePeriod> {
    let created!: MonthlyFeePeriod;

    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        const year = this.requireSchoolYear(data, schoolYearId);
        this.assertMonthInRange(year, monthKey);

        if (year.months[monthKey]) {
          this.throwConflict(
            'MONTH_ALREADY_CREATED',
            'Kỳ tháng đã được tạo.',
          );
        }

        const templates = this.resolveTemplates(data, templateIds);
        const timestamp = new Date().toISOString();
        created = this.snapshotService.buildMonthlyPeriodSnapshot(
          monthKey,
          templates,
          timestamp,
        );
        year.months[monthKey] = created;
        year.updatedAt = timestamp;

        return data;
      }),
    );

    return structuredClone(created);
  }

  private resolveTemplates(
    data: SchoolFeesDataFile,
    templateIds: string[],
  ): FeeTemplate[] {
    const allowedTypes: FeeTemplate['type'][] = ['MONTHLY_FIXED', 'DAILY'];

    for (const templateId of templateIds) {
      const template = data.templates.find((item) => item.id === templateId);

      if (
        !template ||
        !template.active ||
        !allowedTypes.includes(template.type)
      ) {
        this.throwNotFound(
          'FEE_TEMPLATE_NOT_FOUND',
          'Template tháng được chọn không tồn tại, không còn active hoặc sai loại.',
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

  private requireSchoolYear(
    data: SchoolFeesDataFile,
    schoolYearId: string,
  ): SchoolYear {
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

  private throwConflict(errorCode: string, message: string): never {
    throw new ConflictException({ statusCode: 409, errorCode, message });
  }
}
