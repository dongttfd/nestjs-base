import { ApiProperty } from '@nestjs/swagger';
import { ExpenseOverviewCategoryKey } from '@/app/api/consumption/constants/expense-categories';
import {
  ExpenseTransactionPreview,
  ExpenseTransactionPreviewEntity,
} from '@/app/api/consumption/entities/expense-transaction-preview.entity';

export interface ExpenseCategorySummary {
  key: ExpenseOverviewCategoryKey;
  label: string;
  color: string;
  order: number;
  amount: bigint | number;
  percentage: number;
  transactionCount: number;
  latestTransactions: ExpenseTransactionPreview[];
}

export class ExpenseCategorySummaryEntity {
  @ApiProperty()
  key: ExpenseOverviewCategoryKey;

  @ApiProperty()
  label: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  transactionCount: number;

  @ApiProperty({ type: [ExpenseTransactionPreviewEntity] })
  latestTransactions: ExpenseTransactionPreviewEntity[];

  constructor(summary: ExpenseCategorySummary) {
    this.key = summary.key;
    this.label = summary.label;
    this.color = summary.color;
    this.order = summary.order;
    this.amount = Number(summary.amount);
    this.percentage = summary.percentage;
    this.transactionCount = summary.transactionCount;
    this.latestTransactions = summary.latestTransactions.map(
      (transaction) => new ExpenseTransactionPreviewEntity(transaction)
    );
  }
}
