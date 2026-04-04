import { Injectable, NotFoundException } from '@nestjs/common';
import { Consumption, Prisma } from '@prisma/client';
import { addDays, format, subDays, subYears } from 'date-fns';
import { DATE_FORMAT, DEFAULT_PAGINATION_PARAMS, MONTH_FORMAT } from '@/config';
import { PrismaService } from '@/common/services/prisma.service';
import { ensureDate } from '@/common/utils/helpers';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { GetExpenseOverviewQueryDto } from './dto/get-expense-overview-query.dto';
import { UpdateConsumptionDto } from './dto/update-consumption.dto';
import { ExpenseOverviewAggregateService } from './services/expense-overview-aggregate.service';
import { ExpenseOverviewSnapshotService } from './services/expense-overview-snapshot.service';

@Injectable()
export class ConsumptionService {
  constructor(
    private prismaService: PrismaService,
    private expenseOverviewAggregateService: ExpenseOverviewAggregateService,
    private expenseOverviewSnapshotService: ExpenseOverviewSnapshotService,
  ) { }

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

  async create(userId: string, consumptionDto: CreateConsumptionDto) {
    return this.prismaService.$transaction(async (tx) => {
      const consumption = await tx.consumption.create({
        data: {
          ...consumptionDto,
          userId,
          date: new Date(consumptionDto.date),
        },
      });

      await this.expenseOverviewSnapshotService.invalidateSnapshotsByConsumptionDates(
        userId,
        [consumption.date],
        tx,
      );

      return consumption;
    });
  }

  async update(userId: string, consumptionDto: UpdateConsumptionDto) {
    return this.prismaService.$transaction(async (tx) => {
      const existingConsumption = await this.getAccessibleConsumption(userId, consumptionDto.id, tx);

      const updatedConsumption = await tx.consumption.update({
        where: { id: consumptionDto.id },
        data: {
          title: consumptionDto.title,
          amount: consumptionDto.amount,
          date: new Date(consumptionDto.date),
        },
      });

      await this.expenseOverviewSnapshotService.invalidateSnapshotsByConsumptionDates(
        userId,
        [existingConsumption.date, updatedConsumption.date],
        tx,
      );

      return updatedConsumption;
    });
  }

  private async getAccessibleConsumption(
    userId: string,
    id: string,
    client: Pick<PrismaService, 'consumption'> = this.prismaService,
  ) {
    const consumption = await client.consumption.findFirst({
      where: { id, userId },
    });

    if (!consumption) {
      throw new NotFoundException();
    }

    return consumption;
  }

  async destroy(userId: string, id: string) {
    return this.prismaService.$transaction(async (tx) => {
      const consumption = await this.getAccessibleConsumption(userId, id, tx);

      const deletedConsumption = await tx.consumption.delete({ where: { id } });

      await this.expenseOverviewSnapshotService.invalidateSnapshotsByConsumptionDates(
        userId,
        [consumption.date],
        tx,
      );

      return deletedConsumption;
    });
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

  getExpenseOverview(userId: string, query: GetExpenseOverviewQueryDto) {
    return this.expenseOverviewAggregateService.getExpenseOverview(userId, query);
  }
}
