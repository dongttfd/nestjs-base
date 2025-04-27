import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from '@/common';

class InvestmentAmountGroupMonthEntity {

  /**
   * @example '2025-05-05'
   */
  @ApiProperty()
  month: string;

  /**
   * @example 123456
   */
  @ApiProperty()
  amount: number;

  constructor(amountGroupMonth: AmountGroupMonth) {
    this.month = amountGroupMonth.month;
    this.amount = amountGroupMonth.amount;
  }
}

export class InvestmentAmountGroupMonthCollectionEntity extends CollectionEntity<InvestmentAmountGroupMonthEntity> {
  @ApiProperty({ type: [InvestmentAmountGroupMonthEntity] })
  data: InvestmentAmountGroupMonthEntity[];

  constructor(amountGroupMonths: AmountGroupMonth[]) {
    super(amountGroupMonths.map((amountGroupMonth) => new InvestmentAmountGroupMonthEntity(amountGroupMonth)));
  }
}
