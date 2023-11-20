import { ApiProperty } from '@nestjs/swagger';
import { CollectionEntity } from './collection.entity';

export interface PaginateResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number;
  nextPage: number;
}

export class PaginationEntity<T> extends CollectionEntity<T> {
  /**
   * @example 200
   */
  @ApiProperty()
  totalItems: number;

  /**
   * @example 10
   */
  @ApiProperty()
  limit: number;

  /**
   * @example 20
   */
  @ApiProperty()
  totalPages: number;

  /**
   * @example 2
   */
  @ApiProperty()
  page: number;

  /**
   * @example 11
   */
  @ApiProperty()
  pagingCounter: number;

  /**
   * @example true
   */
  @ApiProperty()
  hasPrevPage: boolean;

  /**
   * @example true
   */
  @ApiProperty()
  hasNextPage: boolean;

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

  constructor(pagination: PaginateResult<T>) {
    super(pagination.docs);
    this.totalItems = pagination.totalDocs;
    this.limit = pagination.limit;
    this.totalPages = pagination.totalPages;
    this.page = pagination.page;
    this.pagingCounter = pagination.pagingCounter;
    this.hasPrevPage = pagination.hasPrevPage;
    this.hasNextPage = pagination.hasNextPage;
    this.prevPage = pagination.prevPage;
    this.nextPage = pagination.nextPage;
  }
}
