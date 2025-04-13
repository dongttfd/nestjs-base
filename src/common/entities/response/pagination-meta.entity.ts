import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaEntity {
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

  constructor(meta: PaginatedMeta) {
    this.total = meta.total;
    this.page = meta.page;
    this.itemPerPage = meta.itemPerPage;
    this.prevPage = meta.prevPage;
    this.nextPage = meta.nextPage;
    this.lastPage = meta.lastPage;
  }
}
