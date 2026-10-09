import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  FeeTemplate,
  FeeType,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from '@/app/api/school-fees/repositories/json-school-fees.repository';
import { SchoolFeesTemplateEligibilityService } from './school-fees-template-eligibility.service';

export interface FeeTemplateInput {
  type: FeeType;
  name: string;
  active: boolean;
  defaultAmount?: number;
  defaultMonthOffset?: number;
  priceByMonth?: Record<string, number>;
}

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@Injectable()
export class SchoolFeesTemplateService {
  constructor(
    private readonly repository: JsonSchoolFeesRepository,
    private readonly eligibilityService: SchoolFeesTemplateEligibilityService,
  ) {}

  async list(
    childId: string,
    type?: FeeType,
    eligibleForChild = false,
  ): Promise<FeeTemplate[]> {
    return this.withRepositoryErrors(async () => {
      if (type && !this.isFeeType(type)) {
        this.throwBadRequest('INVALID_FEE_TYPE', 'Loại template không hợp lệ.');
      }

      const data = await this.repository.readChild(childId);
      const byType = data.templates.filter(
        (template) => !type || template.type === type,
      );
      const result = eligibleForChild
        ? this.eligibilityService.filterEligible(byType, data.status)
        : byType;

      return result.map((template) => structuredClone(template));
    });
  }

  async create(
    childId: string,
    input: FeeTemplateInput,
  ): Promise<FeeTemplate> {
    this.validateInput(input);
    const timestamp = new Date().toISOString();
    const template = this.buildTemplate(
      input,
      randomUUID(),
      timestamp,
      timestamp,
      null,
    );

    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        data.templates.push(template);

        return data;
      }),
    );

    return structuredClone(template);
  }

  async update(
    childId: string,
    templateId: string,
    input: FeeTemplateInput,
  ): Promise<FeeTemplate> {
    this.validateInput(input);
    let updated!: FeeTemplate;

    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        const index = data.templates.findIndex(
          (template) => template.id === templateId,
        );

        if (index < 0) {
          this.throwNotFound(
            'FEE_TEMPLATE_NOT_FOUND',
            'Không tìm thấy template khoản thu.',
          );
        }

        const current = data.templates[index];
        updated = this.buildTemplate(
          input,
          current.id,
          current.createdAt,
          new Date().toISOString(),
          current.applicableChildStatus,
        );
        data.templates[index] = updated;

        return data;
      }),
    );

    return structuredClone(updated);
  }

  async delete(childId: string, templateId: string): Promise<string> {
    await this.withRepositoryErrors(() =>
      this.repository.mutateChild(childId, (data) => {
        const index = data.templates.findIndex(
          (template) => template.id === templateId,
        );

        if (index < 0) {
          this.throwNotFound(
            'FEE_TEMPLATE_NOT_FOUND',
            'Không tìm thấy template khoản thu.',
          );
        }

        data.templates.splice(index, 1);

        return data;
      }),
    );

    return templateId;
  }

  private validateInput(input: FeeTemplateInput): void {
    if (
      !this.isFeeType(input.type) ||
      typeof input.name !== 'string' ||
      input.name.trim().length === 0 ||
      input.name.trim().length > 120 ||
      typeof input.active !== 'boolean'
    ) {
      this.throwBadRequest(
        'INVALID_FEE_TEMPLATE',
        'Dữ liệu template không hợp lệ.',
      );
    }

    if (input.type === 'ANNUAL') {
      if (
        !this.isNonNegativeInteger(input.defaultAmount) ||
        !this.isNonNegativeInteger(input.defaultMonthOffset) ||
        input.priceByMonth !== undefined
      ) {
        this.throwBadRequest(
          'INVALID_FEE_TEMPLATE',
          'Template theo năm học không hợp lệ.',
        );
      }

      return;
    }

    if (input.type === 'MONTHLY_FIXED') {
      if (
        !this.isNonNegativeInteger(input.defaultAmount) ||
        input.defaultMonthOffset !== undefined ||
        input.priceByMonth !== undefined
      ) {
        this.throwBadRequest(
          'INVALID_FEE_TEMPLATE',
          'Template cố định theo tháng không hợp lệ.',
        );
      }

      return;
    }

    if (
      input.defaultAmount !== undefined ||
      input.defaultMonthOffset !== undefined ||
      !this.isValidPriceMap(input.priceByMonth)
    ) {
      this.throwBadRequest(
        'INVALID_FEE_TEMPLATE',
        'Template theo ngày không hợp lệ.',
      );
    }
  }

  private buildTemplate(
    input: FeeTemplateInput,
    id: string,
    createdAt: string,
    updatedAt: string,
    applicableChildStatus: FeeTemplate['applicableChildStatus'],
  ): FeeTemplate {
    const common = {
      id,
      name: input.name.trim(),
      active: input.active,
      applicableChildStatus,
      createdAt,
      updatedAt,
    };

    if (input.type === 'ANNUAL') {
      return {
        ...common,
        type: 'ANNUAL',
        defaultAmount: input.defaultAmount as number,
        defaultMonthOffset: input.defaultMonthOffset as number,
      };
    }

    if (input.type === 'MONTHLY_FIXED') {
      return {
        ...common,
        type: 'MONTHLY_FIXED',
        defaultAmount: input.defaultAmount as number,
      };
    }

    return {
      ...common,
      type: 'DAILY',
      priceByMonth: { ...(input.priceByMonth || {}) },
    };
  }

  private isFeeType(value: unknown): value is FeeType {
    return ['ANNUAL', 'MONTHLY_FIXED', 'DAILY'].includes(String(value));
  }

  private isNonNegativeInteger(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0;
  }

  private isValidPriceMap(value: unknown): value is Record<string, number> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return Object.entries(value).every(
      ([monthKey, amount]) =>
        MONTH_KEY_PATTERN.test(monthKey) &&
        Number.isInteger(amount) &&
        amount >= 0,
    );
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
