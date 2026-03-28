import { ApiProperty } from '@nestjs/swagger';
import { ExpenseOverviewPeriod } from '@/app/api/consumption/constants/expense-categories';
import {
  ExpenseCategorySummary,
  ExpenseCategorySummaryEntity,
} from '@/app/api/consumption/entities/expense-category-summary.entity';

export interface ExpenseOverviewResponse {
  period: ExpenseOverviewPeriod;
  taxonomyVersion: string;
  classifierVersion: string;
  range: {
    start: Date;
    end: Date;
  };
  totalAmount: bigint | number;
  isEmpty: boolean;
  isStale: boolean;
  lastSuccessfulRefreshAt: Date | null;
  groups: ExpenseCategorySummary[];
}

class ExpenseOverviewRangeEntity {
  @ApiProperty()
  start: Date;

  @ApiProperty()
  end: Date;

  constructor(range: ExpenseOverviewResponse['range']) {
    this.start = range.start;
    this.end = range.end;
  }
}

export class ExpenseOverviewResponseEntity {
  @ApiProperty()
  period: ExpenseOverviewPeriod;

  @ApiProperty()
  taxonomyVersion: string;

  @ApiProperty()
  classifierVersion: string;

  @ApiProperty({ type: ExpenseOverviewRangeEntity })
  range: ExpenseOverviewRangeEntity;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  isEmpty: boolean;

  @ApiProperty()
  isStale: boolean;

  @ApiProperty({ nullable: true })
  lastSuccessfulRefreshAt: Date | null;

  @ApiProperty({ type: [ExpenseCategorySummaryEntity] })
  groups: ExpenseCategorySummaryEntity[];

  constructor(overview: ExpenseOverviewResponse) {
    this.period = overview.period;
    this.taxonomyVersion = overview.taxonomyVersion;
    this.classifierVersion = overview.classifierVersion;
    this.range = new ExpenseOverviewRangeEntity(overview.range);
    this.totalAmount = Number(overview.totalAmount);
    this.isEmpty = overview.isEmpty;
    this.isStale = overview.isStale;
    this.lastSuccessfulRefreshAt = overview.lastSuccessfulRefreshAt;
    this.groups = overview.groups.map((group) => new ExpenseCategorySummaryEntity(group));
  }
}
