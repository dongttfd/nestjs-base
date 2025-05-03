import { Injectable, NotFoundException } from '@nestjs/common';
import { Investment, Prisma } from '@prisma/client';
import { addDays, format, subYears } from 'date-fns';
import { PrismaService, ensureDate } from '@/common';
import { DEFAULT_PAGINATION_PARAMS, MONTH_FORMAT } from '@/config';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@Injectable()
export class InvestmentService {
  constructor(private prismaService: PrismaService) { }

  paginate(
    userId: string,
    params: PaginationWithDateQueryParams = DEFAULT_PAGINATION_PARAMS
  ) {
    const date = ensureDate(params.date);
    const createdAt = ensureDate(params.createdAt);

    return this.prismaService.paginator()<
      Investment,
      Prisma.InvestmentFindManyArgs
    >(
      this.prismaService.investment,
      {
        where: {
          userId,
          ...(date && { date: { lt: date } }),
          ...(createdAt && { createdAt: { lt: createdAt } }),
        },
        orderBy: [
          { date: Prisma.SortOrder.desc },
          { createdAt: Prisma.SortOrder.desc }
        ],
      },
      params,
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

  async getInvestmentStatisticGrouped(userId: string) {
    return this.getStatisticByMonth(userId);
  }

  async getStatisticByYear(userId: string) {
    const today = new Date();
    const from = subYears(today, 10);
    const to = addDays(today, 1);
    from.setMonth(0);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    return this.prismaService.$queryRaw<AmountGroupYear[]>(Prisma.sql`SELECT EXTRACT(YEAR FROM date) AS year, SUM(amount) AS amount
        FROM investments
        where userId = ${userId}
        AND date < ${to}
        AND date >= ${from}
        GROUP BY year
        ORDER BY year ASC;
      `);
  }

  async getStatisticByMonth(userId: string) {
    const today = new Date();
    const from = new Date(today);
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const to = addDays(today, 1);
    to.setHours(0, 0, 0, 0);

    const investments = await this.prismaService.investment.findMany({
      where: {
        userId,
        date: {
          lt: to,
          gte: from
        }
      }
    });

    const investmentsDayMap = new Map<string, bigint>();
    investments.forEach((investment) => {
      const dateKey = format(investment.date, MONTH_FORMAT);
      const currentAmount = investmentsDayMap.get(dateKey) || BigInt(0);
      investmentsDayMap.set(dateKey, currentAmount + BigInt(investment.amount));
    });

    return Array.from(investmentsDayMap.entries())
      .map(([month, amount]) => ({ month, amount }));
  }
}
