import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from './collection.entity';

export class PaginationEntity<T> extends CollectionEntity<T> {
  /**
   * @example 200
   */
  @ApiProperty()
  total: number;

  /**
   * @example 2
   */
  @ApiProperty()
  page: number;

  /**
   * @example 10
   */
  @ApiProperty()
  itemPerPage: number;

  /**
   * @example 1
   */
  @ApiProperty()
  prevPage: number;

  /**
   * @example 3
   */
  @ApiProperty()
  nextPage: number;

  /**
   * @example 11
   */
  @ApiProperty()
  lastPage: number;

  constructor(pagination: PaginatedResult<T>) {
    super(pagination.data);

    // assign meta
    this.total = pagination.meta.total;
    this.page = pagination.meta.page;
    this.itemPerPage = pagination.meta.itemPerPage;
    this.prevPage = pagination.meta.prevPage;
    this.nextPage = pagination.meta.nextPage;
    this.lastPage = pagination.meta.lastPage;
  }
}
