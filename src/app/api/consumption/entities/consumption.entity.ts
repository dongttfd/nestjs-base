import { ApiProperty } from '@nestjs/swagger';
import { Consumption } from '@prisma/client';

export class ConsumptionEntity {
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

  constructor(consumption: Partial<Consumption>) {
    this.id = consumption.id;
    this.userId = consumption.userId;
    this.title = consumption.title;
    this.amount = Number(consumption.amount);
    this.date = consumption.date;
    this.createdAt = consumption.createdAt;
  }
}
