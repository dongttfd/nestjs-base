import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class UpdateAttendanceDto {
  @IsArray()
  @ArrayUnique()
  @IsDateString({}, { each: true })
  attendanceDates!: string[];

  @IsOptional()
  @IsBoolean()
  confirmReopenPaidMonth?: boolean;
}
