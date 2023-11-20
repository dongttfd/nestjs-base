import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import {
  BOOLEAN_PARAM,
  DEFAULT_LIMIT_PAGINATION,
  SORT_ASC,
  SORT_DESC,
} from '@/config';

export const ApiPagination = () =>
  applyDecorators(
    ApiQuery({
      name: 'pagination',
      required: false,
      enum: Object.values(BOOLEAN_PARAM),
      description:
        'If pagination is set to 0, it will return all data without adding limit condition. (Default: 1)',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      example: 1,
      description: 'Start page: 1',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 10,
      description: `Default ${DEFAULT_LIMIT_PAGINATION}`,
    }),
  );

export const ApiSort = (allowSortFields?: string[]) =>
  applyDecorators(
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      enum: allowSortFields?.length ? allowSortFields : undefined,
    }),
    ApiQuery({
      name: 'sortDirection',
      enum: [SORT_ASC, SORT_DESC],
      required: false,
    }),
  );
