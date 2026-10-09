import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AnnualFeeItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  assignedMonthKey!: string;

  @IsOptional()
  @IsBoolean()
  confirmReopenPaidMonth?: boolean;
}

export class CreateAnnualFeeItemDto extends AnnualFeeItemDto {}
export class UpdateAnnualFeeItemDto extends AnnualFeeItemDto {}
