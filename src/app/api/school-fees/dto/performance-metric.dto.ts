import {
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export type SchoolFeesClientPerformanceMetricName =
  | 'school_fees_page_load_ms'
  | 'school_fees_interaction_ms';

export class PerformanceMetricDto {
  @IsIn(['school_fees_page_load_ms', 'school_fees_interaction_ms'])
  name!: SchoolFeesClientPerformanceMetricName;

  @IsNumber()
  @Min(0)
  durationMs!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  route!: string;
}
