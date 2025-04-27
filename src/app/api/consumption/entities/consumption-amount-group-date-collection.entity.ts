import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from '@/common';

class ConsumptionAmountGroupDateEntity {

  /**
   * @example '2025-05-05'
   */
  @ApiProperty()
  date: string;

  /**
   * @example 123456
   */
  @ApiProperty()
  amount: number;

  constructor(amountGroupDate: AmountGroupDate) {
    this.date = amountGroupDate.date;
    this.amount = amountGroupDate.amount;
  }
}

export class ConsumptionAmountGroupDateCollectionEntity extends CollectionEntity<ConsumptionAmountGroupDateEntity> {
  @ApiProperty({ type: [ConsumptionAmountGroupDateEntity] })
  data: ConsumptionAmountGroupDateEntity[];

  constructor(amountGroupDates: AmountGroupDate[]) {
    super(amountGroupDates.map((amountGroupDate) => new ConsumptionAmountGroupDateEntity(amountGroupDate)));
  }
}
