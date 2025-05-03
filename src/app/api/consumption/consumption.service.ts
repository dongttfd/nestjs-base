import { Injectable, NotFoundException } from '@nestjs/common';
import { Consumption, Prisma } from '@prisma/client';
import { addDays, format, subDays, subYears } from 'date-fns';
import { PrismaService, ensureDate } from '@/common';
import { DATE_FORMAT, DEFAULT_PAGINATION_PARAMS, MONTH_FORMAT } from '@/config';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { UpdateConsumptionDto } from './dto/update-consumption.dto';

@Injectable()
export class ConsumptionService {
  constructor(private prismaService: PrismaService) { }

  paginate(
    userId: string,
    params: PaginationWithDateQueryParams = DEFAULT_PAGINATION_PARAMS,
  ) {
    const date = ensureDate(params.date);
    const createdAt = ensureDate(params.createdAt);

    return this.prismaService.paginator()<
      Consumption,
      Prisma.ConsumptionFindManyArgs
    >(
      this.prismaService.consumption,
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

  create(userId: string, consumptionDto: CreateConsumptionDto) {
    return this.prismaService.consumption.create({
      data: {
        ...consumptionDto,
        userId,
        date: new Date(consumptionDto.date),
      },
    });
  }

  async update(userId: string, consumptionDto: UpdateConsumptionDto) {
    await this.canAccessConsumption(consumptionDto.id, userId);

    return this.prismaService.consumption.update({
      where: { id: consumptionDto.id },
      data: {
        title: consumptionDto.title,
        amount: consumptionDto.amount,
        date: new Date(consumptionDto.date),
      },
    });
  }

  private async canAccessConsumption(userId: string, id: string) {
    const consumption = await this.prismaService.consumption.findFirst({
      where: { id, userId },
    });

    if (!consumption) {
      throw new NotFoundException();
    }
  }

  async destroy(userId: string, id: string) {
    await this.canAccessConsumption(userId, id);

    return this.prismaService.consumption.delete({ where: { id } });
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
      FROM consumptions
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

    const consumptions = await this.prismaService.consumption.findMany({
      where: {
        userId,
        date: {
          lt: to,
          gte: from
        }
      }
    });

    const consumptionsDayMap = new Map<string, bigint>();
    consumptions.forEach((consumption) => {
      const dateKey = format(consumption.date, MONTH_FORMAT);
      const currentAmount = consumptionsDayMap.get(dateKey) || BigInt(0);
      consumptionsDayMap.set(dateKey, currentAmount + BigInt(consumption.amount));
    });

    return Array.from(consumptionsDayMap.entries())
      .map(([month, amount]) => ({ month, amount }));
  }

  async getStatisticByDate(userId: string) {
    const today = new Date();
    const from = subDays(today, 7);
    const to = addDays(today, 1);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    const consumptions = await this.prismaService.consumption.findMany({
      where: {
        userId,
        date: {
          lt: to,
          gte: from
        }
      }
    });

    const consumptionDayMap = new Map<string, bigint>();
    consumptions.forEach((consumption) => {
      const dateKey = format(consumption.date, DATE_FORMAT);
      const currentAmount = consumptionDayMap.get(dateKey) || BigInt(0);
      consumptionDayMap.set(dateKey, currentAmount + BigInt(consumption.amount));
    });

    return Array.from(consumptionDayMap.entries()).map(
      ([date, amount]) => ({ date, amount })
    );
  }
}
