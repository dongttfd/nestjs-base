import { Injectable, NotFoundException } from '@nestjs/common';
import { Consumption, Prisma } from '@prisma/client';
import { addDays, format, subDays } from 'date-fns';
import { PrismaService, ensureDate, sameDate } from '@/common';
import { DATE_FORMAT, DEFAULT_PAGINATION_PARAMS, StatisticGroupBy } from '@/config';
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

  async getConsumptionStatisticGrouped(userId: string, groupBy = StatisticGroupBy.DAY) {
    if (groupBy === StatisticGroupBy.YEAR) {
      return this.getStatisticByYear();
    }

    if (groupBy === StatisticGroupBy.MONTH) {
      return this.getStatisticByMonth();
    }

    return this.getStatisticByDay(userId);
  }

  private getStatisticByYear() {

  }

  private getStatisticByMonth() {

  }

  private async getStatisticByDay(userId: string) {
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

    const result = consumptions.reduce((previous, currentValue) => {
      const current = previous.find((pr) => sameDate(pr.date, currentValue.date));
      if (!current) {
        previous.push({
          date: format(currentValue.date, DATE_FORMAT),
          amount: Number(currentValue.amount)
        });
      } else {
        current.amount += Number(currentValue.amount);
      }

      return previous;
    }, [] as AmountGroupDate[]);

    return result;
  }
}
