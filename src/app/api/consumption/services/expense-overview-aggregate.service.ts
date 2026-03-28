import { Injectable } from '@nestjs/common';
import { Consumption } from '@prisma/client';
import { isSameDay } from 'date-fns';
import { PrismaService } from '@/common/services/prisma.service';
import {
  EXPENSE_OVERVIEW_CLASSIFIER_VERSION,
  EXPENSE_CATEGORIES_BY_KEY,
  EXPENSE_OVERVIEW_CATEGORY_KEYS,
  EXPENSE_OVERVIEW_TAXONOMY_VERSION,
  ExpenseOverviewPeriod,
} from '@/app/api/consumption/constants/expense-categories';
import { GetExpenseOverviewQueryDto } from '@/app/api/consumption/dto/get-expense-overview-query.dto';
import { ExpenseCategorySummary } from '@/app/api/consumption/entities/expense-category-summary.entity';
import { ExpenseOverviewResponse } from '@/app/api/consumption/entities/expense-overview-response.entity';
import { ExpenseTransactionPreview } from '@/app/api/consumption/entities/expense-transaction-preview.entity';
import { ExpenseClassifierService } from '@/app/api/consumption/services/expense-classifier.service';
import { ExpenseOverviewSnapshotService } from '@/app/api/consumption/services/expense-overview-snapshot.service';
import { resolveExpensePeriodRange } from '@/app/api/consumption/utils/expense-period.util';

@Injectable()
export class ExpenseOverviewAggregateService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly expenseClassifierService: ExpenseClassifierService,
    private readonly expenseOverviewSnapshotService: ExpenseOverviewSnapshotService,
  ) {}

  resolvePeriodRange(query: GetExpenseOverviewQueryDto) {
    return resolveExpensePeriodRange(query.period, query.anchorDate);
  }

  async getExpenseOverview(
    userId: string,
    query: GetExpenseOverviewQueryDto,
  ): Promise<ExpenseOverviewResponse> {
    const range = this.resolvePeriodRange(query);
    const lastAttemptAt = new Date();

    await this.expenseOverviewSnapshotService.purgeLegacySnapshots(userId);

    const reusableSnapshot = await this.expenseOverviewSnapshotService.findReusableSnapshot(
      userId,
      query.period,
      range,
    );

    if (this.canServeCachedSnapshot(reusableSnapshot, lastAttemptAt)) {
      return reusableSnapshot;
    }

    try {
      const consumptions = await this.prismaService.consumption.findMany({
        where: {
          userId,
          amount: { gt: BigInt(0) },
          date: {
            gte: range.start,
            lte: range.end,
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });

      const lastSuccessfulRefreshAt = new Date();
      const overview = this.buildOverview(
        query.period,
        range,
        consumptions,
        false,
        lastSuccessfulRefreshAt,
      );

      await this.expenseOverviewSnapshotService.saveSuccessfulSnapshot({
        userId,
        period: query.period,
        range,
        overview,
        lastAttemptAt,
      });

      return overview;
    } catch (error) {
      const snapshot = await this.expenseOverviewSnapshotService.findLatestSuccessfulSnapshot(
        userId,
        query.period,
        range,
      );

      if (snapshot) {
        await this.expenseOverviewSnapshotService.saveStaleSnapshot({
          userId,
          period: query.period,
          range,
          overview: snapshot,
          lastAttemptAt,
        });

        return snapshot;
      }

      throw error;
    }
  }

  private canServeCachedSnapshot(
    snapshot: ExpenseOverviewResponse | null,
    now: Date,
  ) {
    if (!snapshot?.lastSuccessfulRefreshAt) {
      return false;
    }

    return isSameDay(snapshot.lastSuccessfulRefreshAt, now);
  }

  buildOverview(
    period: ExpenseOverviewPeriod,
    range: ReturnType<typeof resolveExpensePeriodRange>,
    consumptions: Consumption[],
    isStale: boolean,
    lastSuccessfulRefreshAt: Date | null,
  ): ExpenseOverviewResponse {
    const groupedConsumptions = this.groupConsumptionsByCategory(consumptions);
    const totalAmount = consumptions.reduce(
      (total, consumption) => total + BigInt(consumption.amount),
      BigInt(0),
    );
    const groups = EXPENSE_OVERVIEW_CATEGORY_KEYS.reduce<ExpenseCategorySummary[]>(
      (result, categoryKey) => {
        const categoryConsumptions = groupedConsumptions.get(categoryKey) ?? [];

        if (categoryConsumptions.length === 0) {
          return result;
        }

        const amount = categoryConsumptions.reduce(
          (total, consumption) => total + BigInt(consumption.amount),
          BigInt(0),
        );
        const category = EXPENSE_CATEGORIES_BY_KEY[categoryKey];

        result.push({
          key: categoryKey,
          label: category.label,
          color: category.color,
          order: category.order,
          amount,
          percentage: this.calculatePercentage(amount, totalAmount),
          transactionCount: categoryConsumptions.length,
          latestTransactions: this.buildTopTransactions(categoryConsumptions),
        });

        return result;
      },
      [],
    );

    return {
      period,
      taxonomyVersion: EXPENSE_OVERVIEW_TAXONOMY_VERSION,
      classifierVersion: EXPENSE_OVERVIEW_CLASSIFIER_VERSION,
      range: {
        start: range.start,
        end: range.end,
      },
      totalAmount,
      isEmpty: consumptions.length === 0,
      isStale,
      lastSuccessfulRefreshAt,
      groups,
    };
  }

  private buildTopTransactions(
    consumptions: Consumption[],
  ): ExpenseTransactionPreview[] {
    return [...consumptions]
      .sort((left, right) => {
        const amountDiff = Number(right.amount) - Number(left.amount);

        if (amountDiff !== 0) {
          return amountDiff;
        }

        const dateDiff = right.date.getTime() - left.date.getTime();

        if (dateDiff !== 0) {
          return dateDiff;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      })
      .slice(0, 10)
      .map((consumption) => ({
        id: consumption.id,
        title: consumption.title,
        amount: consumption.amount,
        happenedAt: consumption.date,
      }));
  }

  private groupConsumptionsByCategory(consumptions: Consumption[]) {
    return consumptions.reduce((result, consumption) => {
      const categoryKey = this.expenseClassifierService.classify(consumption.title);
      const currentConsumptions = result.get(categoryKey) ?? [];

      currentConsumptions.push(consumption);
      result.set(categoryKey, currentConsumptions);

      return result;
    }, new Map<typeof EXPENSE_OVERVIEW_CATEGORY_KEYS[number], Consumption[]>());
  }

  private calculatePercentage(amount: bigint, totalAmount: bigint) {
    if (totalAmount === BigInt(0)) {
      return 0;
    }

    return Math.round((Number(amount) / Number(totalAmount)) * 10000) / 100;
  }
}
