import { Injectable, NotFoundException } from '@nestjs/common';
import { Investment, Prisma } from '@prisma/client';
import { PrismaService, ensureDate } from '@/common';
import { DEFAULT_PAGINATION_PARAMS } from '@/config';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@Injectable()
export class InvestmentService {
  constructor(private prismaService: PrismaService) {}

  paginate(
    userId: string,
    paginationParams = DEFAULT_PAGINATION_PARAMS,
    date?: Date,
  ) {
    const beforeDate = ensureDate(date);

    return this.prismaService.paginator()<
      Investment,
      Prisma.InvestmentFindManyArgs
    >(
      this.prismaService.investment,
      {
        where: {
          userId,
          date: beforeDate ? { lte: beforeDate } : undefined,
        },
        orderBy: { date: Prisma.SortOrder.desc },
      },
      paginationParams,
    );
  }

  create(userId: string, investmentDto: CreateInvestmentDto) {
    return this.prismaService.investment.create({
      data: {
        ...investmentDto,
        userId,
        date: new Date(investmentDto.date),
      },
    });
  }

  async update(userId: string, investmentDto: UpdateInvestmentDto) {
    await this.canAccessInvestment(investmentDto.id, userId);

    return this.prismaService.investment.update({
      where: { id: investmentDto.id },
      data: {
        title: investmentDto.title,
        amount: investmentDto.amount,
        date: new Date(investmentDto.date),
      },
    });
  }

  private async canAccessInvestment(userId: string, id: string) {
    const Investment = await this.prismaService.investment.findFirst({
      where: { id, userId },
    });

    if (!Investment) {
      throw new NotFoundException();
    }
  }

  async destroy(userId: string, id: string) {
    await this.canAccessInvestment(userId, id);

    return this.prismaService.investment.delete({ where: { id } });
  }
}