import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from '@/common';

class ConsumptionAmountGroupYearEntity {

  /**
   * @example '2025'
   */
  @ApiProperty()
  year: string;

  /**
   * @example 123456
   */
  @ApiProperty()
  amount: number;

  constructor(amountGroupYear: AmountGroupYear) {
    this.year = amountGroupYear.year;
    this.amount = Number(amountGroupYear.amount);
  }
}

export class ConsumptionAmountGroupYearCollectionEntity extends CollectionEntity<ConsumptionAmountGroupYearEntity> {
  @ApiProperty({ type: [ConsumptionAmountGroupYearEntity] })
  data: ConsumptionAmountGroupYearEntity[];

  constructor(amountGroupYears: AmountGroupYear[]) {
    super(amountGroupYears.map((amountGroupYear) => new ConsumptionAmountGroupYearEntity(amountGroupYear)));
  }
}
