import { ApiProperty } from '@nestjs/swagger';

export interface ExpenseTransactionPreview {
  id: string;
  title: string;
  amount: bigint | number;
  happenedAt: Date;
}

export class ExpenseTransactionPreviewEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  happenedAt: Date;

  constructor(transaction: ExpenseTransactionPreview) {
    this.id = transaction.id;
    this.title = transaction.title;
    this.amount = Number(transaction.amount);
    this.happenedAt = transaction.happenedAt;
  }
}
