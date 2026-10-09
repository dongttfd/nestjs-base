import {
  IsBoolean,
  IsIn,
  IsInt,
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

export type MonthlyItemType = 'MONTHLY_FIXED' | 'DAILY';

@ValidatorConstraint({ name: 'monthlyItemDiscriminator', async: false })
export class MonthlyItemDiscriminatorConstraint
implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const value = args.object as MonthlyFeeItemDto;

    if (value.type === 'MONTHLY_FIXED') {
      return (
        Number.isInteger(value.amount) &&
        (value.amount as number) >= 0 &&
        value.unitPrice === undefined
      );
    }

    if (value.type === 'DAILY') {
      return (
        value.amount === undefined &&
        Object.prototype.hasOwnProperty.call(value, 'unitPrice') &&
        (value.unitPrice === null ||
          (Number.isInteger(value.unitPrice) && (value.unitPrice as number) >= 0))
      );
    }

    return false;
  }

  defaultMessage(): string {
    return 'Dữ liệu khoản thu không khớp với type.';
  }
}

export class MonthlyFeeItemDto {
  @IsIn(['MONTHLY_FIXED', 'DAILY'])
  @Validate(MonthlyItemDiscriminatorConstraint)
  type!: MonthlyItemType;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number | null;

  @IsOptional()
  @IsBoolean()
  confirmReopenPaidMonth?: boolean;
}

export class CreateMonthlyItemDto extends MonthlyFeeItemDto {}
export class UpdateMonthlyItemDto extends MonthlyFeeItemDto {}
