import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_PAGINATION_PARAMS } from '@/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  paginator(paginationParams?: PaginationParams): PaginateFunction {
    return async (model, args: any = { where: undefined }, options) => {
      const page =
        Number(options?.page || paginationParams?.page) ||
        DEFAULT_PAGINATION_PARAMS.page;
      const itemPerPage =
        Number(options?.limit || paginationParams?.limit) ||
        DEFAULT_PAGINATION_PARAMS.limit;

      const skip = page > 0 ? itemPerPage * (page - 1) : 0;
      const [total, data] = await Promise.all([
        model.count({ where: args.where }),
        model.findMany({
          ...args,
          take: itemPerPage,
          skip,
        }),
      ]);
      const lastPage = Math.ceil(total / itemPerPage);

      return {
        data,
        meta: {
          total,
          page: page,
          itemPerPage,
          prevPage: page > 1 ? page - 1 : null,
          nextPage: page < lastPage ? page + 1 : null,
          lastPage,
        },
      };
    };
  }
}
