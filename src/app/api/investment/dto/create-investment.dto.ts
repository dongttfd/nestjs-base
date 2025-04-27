import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateInvestmentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-1000000000000)
  @Max(1000000000000)
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  date: Date;
}
