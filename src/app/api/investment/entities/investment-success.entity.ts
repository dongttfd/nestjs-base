import { ApiProperty } from '@nestjs/swagger';
import { Investment } from '@prisma/client';
import { SuccessEntity } from '@/common';
import { InvestmentEntity } from './investment.entity';

export class InvestmentSuccessEntity extends SuccessEntity<InvestmentEntity> {
  @ApiProperty({ type: InvestmentEntity })
  data: InvestmentEntity;

  constructor(investment: Investment) {
    super(new InvestmentEntity(investment));
  }
}
