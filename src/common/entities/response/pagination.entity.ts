import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from './collection.entity';
import { PaginationMetaEntity } from './pagination-meta.entity';

export class PaginationEntity<T> extends CollectionEntity<T> {
  @ApiProperty({ type: PaginationMetaEntity })
  meta: PaginationMetaEntity;

  constructor(pagination: PaginatedResult<T>) {
    super(pagination.data);

    // assign meta
    this.meta = new PaginationMetaEntity(pagination.meta);
  }
}
