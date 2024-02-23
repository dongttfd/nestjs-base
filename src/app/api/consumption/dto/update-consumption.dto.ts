import { ApiHideProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateConsumptionDto {
  @IsNotEmpty()
  @IsString()
  @ApiHideProperty()
  id: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1000000000000)
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  date: Date;
}
