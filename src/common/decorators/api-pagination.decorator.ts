import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import {
  BOOLEAN_PARAM,
  DEFAULT_LIMIT_PAGINATION,
  SORT_ASC,
  SORT_DESC,
} from '@/config';

interface ApiPaginationParams {
  pagination?: boolean;
  page?: boolean;
  limit?: boolean;
}

export const ApiPagination = ({
  pagination = false,
  page = true,
  limit = true,
}: ApiPaginationParams) => {
  const decorators = [];

  if (pagination) {
    decorators.push(
      ApiQuery({
        name: 'pagination',
        required: false,
        enum: Object.values(BOOLEAN_PARAM),
        description:
          'If pagination is set to 0, it will return all data without adding limit condition. (Default: 1)',
      }),
    );
  }

  if (page) {
    decorators.push(
      ApiQuery({
        name: 'page',
        required: false,
        example: 1,
        description: 'Start page: 1',
      }),
    );
  }

  if (limit) {
    decorators.push(
      ApiQuery({
        name: 'limit',
        required: false,
        example: 10,
        description: `Default ${DEFAULT_LIMIT_PAGINATION}`,
      }),
    );
  }

  return applyDecorators(...decorators);
};

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
