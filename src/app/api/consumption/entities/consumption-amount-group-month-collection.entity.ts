import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from '@/common';

class ConsumptionAmountGroupMonthEntity {

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
    this.amount = Number(amountGroupMonth.amount);
  }
}

export class ConsumptionAmountGroupMonthCollectionEntity extends CollectionEntity<ConsumptionAmountGroupMonthEntity> {
  @ApiProperty({ type: [ConsumptionAmountGroupMonthEntity] })
  data: ConsumptionAmountGroupMonthEntity[];

  constructor(amountGroupMonths: AmountGroupMonth[]) {
    super(amountGroupMonths.map((amountGroupMonth) => new ConsumptionAmountGroupMonthEntity(amountGroupMonth)));
  }
}
