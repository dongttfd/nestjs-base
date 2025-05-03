import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from '@/common';

class InvestmentAmountGroupYearEntity {

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

export class InvestmentAmountGroupYearCollectionEntity extends CollectionEntity<InvestmentAmountGroupYearEntity> {
  @ApiProperty({ type: [InvestmentAmountGroupYearEntity] })
  data: InvestmentAmountGroupYearEntity[];

  constructor(amountGroupYears: AmountGroupYear[]) {
    super(amountGroupYears.map((amountGroupYear) => new InvestmentAmountGroupYearEntity(amountGroupYear)));
  }
}
