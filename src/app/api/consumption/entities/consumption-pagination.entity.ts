import { ApiProperty } from '@nestjs/swagger';
import { Consumption } from '@prisma/client';
import { PaginationEntity } from '@/common';
import { ConsumptionEntity } from './consumption.entity';

export class ConsumptionPaginationEntity extends PaginationEntity<ConsumptionEntity> {
  @ApiProperty({ type: [ConsumptionEntity] })
  data: ConsumptionEntity[];

  constructor(paginatedResult: PaginatedResult<Consumption>) {
    super({
      ...paginatedResult,
      data: paginatedResult.data.map(
        (consumption) => new ConsumptionEntity(consumption),
      ),
    });
  }
}
