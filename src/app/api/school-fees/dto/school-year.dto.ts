import {
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateSchoolYearDto {
  @IsString()
  @Matches(/^\d{4}-\d{4}$/)
  id!: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  startMonthKey!: string;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  endMonthKey!: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  annualTemplateIds!: string[];

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  firstMonthTemplateIds!: string[];
}
