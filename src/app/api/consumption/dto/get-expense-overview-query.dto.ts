import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';
import {
  EXPENSE_OVERVIEW_PERIODS,
  ExpenseOverviewPeriod,
} from '@/app/api/consumption/constants/expense-categories';

export class GetExpenseOverviewQueryDto {
  @IsIn([...EXPENSE_OVERVIEW_PERIODS])
  period: ExpenseOverviewPeriod;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  anchorDate?: Date;
}
