import { ApiProperty } from '@nestjs/swagger';
import { Investment } from '@prisma/client';
import { PaginationEntity } from '@/common';
import { InvestmentEntity } from './investment.entity';

export class InvestmentPaginationEntity extends PaginationEntity<InvestmentEntity> {
  @ApiProperty({ type: [InvestmentEntity] })
  data: InvestmentEntity[];

  constructor(paginatedResult: PaginatedResult<Investment>) {
    super({
      ...paginatedResult,
      data: paginatedResult.data.map(
        (investment) => new InvestmentEntity(investment),
      ),
    });
  }
}
