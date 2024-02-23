import { ApiProperty } from '@nestjs/swagger';
import { Consumption } from '@prisma/client';
import { SuccessEntity } from '@/common';
import { ConsumptionEntity } from './consumption.entity';

export class ConsumptionSuccessEntity extends SuccessEntity<ConsumptionEntity> {
  @ApiProperty({ type: ConsumptionEntity })
  data: ConsumptionEntity;

  constructor(consumption: Consumption) {
    super(new ConsumptionEntity(consumption));
  }
}
