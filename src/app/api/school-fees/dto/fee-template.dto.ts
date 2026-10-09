import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { FeeType } from '@/app/api/school-fees/models/school-fees.model';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@ValidatorConstraint({ name: 'feeTemplateDiscriminator', async: false })
export class FeeTemplateDiscriminatorConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const input = args.object as FeeTemplateDto;

    if (input.type === 'ANNUAL') {
      return (
        Number.isInteger(input.defaultAmount) &&
        (input.defaultAmount as number) >= 0 &&
        Number.isInteger(input.defaultMonthOffset) &&
        (input.defaultMonthOffset as number) >= 0 &&
        input.priceByMonth === undefined
      );
    }

    if (input.type === 'MONTHLY_FIXED') {
      return (
        Number.isInteger(input.defaultAmount) &&
        (input.defaultAmount as number) >= 0 &&
        input.defaultMonthOffset === undefined &&
        input.priceByMonth === undefined
      );
    }

    if (input.type === 'DAILY') {
      return (
        input.defaultAmount === undefined &&
        input.defaultMonthOffset === undefined &&
        this.isValidPriceMap(input.priceByMonth)
      );
    }

    return false;
  }

  defaultMessage(): string {
    return 'Dữ liệu template không khớp với type.';
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
}

export class FeeTemplateDto {
  @IsIn(['ANNUAL', 'MONTHLY_FIXED', 'DAILY'])
  @Validate(FeeTemplateDiscriminatorConstraint)
  type!: FeeType;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsBoolean()
  active!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultMonthOffset?: number;

  @IsOptional()
  @IsObject()
  priceByMonth?: Record<string, number>;
}

export class CreateFeeTemplateDto extends FeeTemplateDto {}
export class UpdateFeeTemplateDto extends FeeTemplateDto {}
