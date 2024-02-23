import { Injectable, NotFoundException } from '@nestjs/common';
import { Consumption, Prisma } from '@prisma/client';
import { PrismaService, ensureDate } from '@/common';
import { DEFAULT_PAGINATION_PARAMS } from '@/config';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { UpdateConsumptionDto } from './dto/update-consumption.dto';

@Injectable()
export class ConsumptionService {
  constructor(private prismaService: PrismaService) {}

  paginate(
    userId: string,
    paginationParams = DEFAULT_PAGINATION_PARAMS,
    date?: Date,
  ) {
    const beforeDate = ensureDate(date);

    return this.prismaService.paginator()<
      Consumption,
      Prisma.ConsumptionFindManyArgs
    >(
      this.prismaService.consumption,
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
}
