import { ApiProperty } from '@nestjs/swagger';
import { Investment } from '@prisma/client';

export class InvestmentEntity {
  /**
   * @example '000000000-0000-0000-0000-000000000000'
   */
  @ApiProperty()
  id: string;

  /**
   * @example '000000000-0000-0000-0000-000000000000'
   */
  @ApiProperty()
  userId: string;

  /**
   * @example 'bcs'
   */
  @ApiProperty()
  title: string;

  /**
   * @example 1000000
   */
  @ApiProperty()
  amount: number;

  /**
   * @example '2024-01-01T00:00:00.000Z'
   */
  @ApiProperty()
  date: Date;

  /**
   * @example '2024-01-01T00:00:00.000Z'
   */
  @ApiProperty()
  createdAt: Date;

  constructor(investment: Partial<Investment>) {
    this.id = investment.id;
    this.userId = investment.userId;
    this.title = investment.title;
    this.amount = Number(investment.amount);
    this.date = investment.date;
    this.createdAt = investment.createdAt;
  }
}
