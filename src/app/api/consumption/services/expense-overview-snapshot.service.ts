import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/services/prisma.service';
import {
  EXPENSE_OVERVIEW_CLASSIFIER_VERSION,
  EXPENSE_OVERVIEW_TAXONOMY_VERSION,
  ExpenseOverviewPeriod,
} from '@/app/api/consumption/constants/expense-categories';
import { ExpenseCategorySummary } from '@/app/api/consumption/entities/expense-category-summary.entity';
import { ExpenseOverviewResponse } from '@/app/api/consumption/entities/expense-overview-response.entity';
import { ExpenseTransactionPreview } from '@/app/api/consumption/entities/expense-transaction-preview.entity';
import { resolveExpensePeriodRange } from '@/app/api/consumption/utils/expense-period.util';

interface ExpenseOverviewSnapshotRecord {
  id: string;
  userId: string;
  period: ExpenseOverviewPeriod;
  anchorDate: Date;
  rangeStart: Date;
  rangeEnd: Date;
  totalAmount: bigint;
  taxonomyVersion: string;
  classifierVersion: string;
  lastSuccessfulRefreshAt: Date | null;
  lastAttemptAt: Date | null;
  refreshStatus: string;
  isEmpty: boolean;
  groups: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

interface SaveSnapshotParams {
  userId: string;
  period: ExpenseOverviewPeriod;
  range: ReturnType<typeof resolveExpensePeriodRange>;
  overview: ExpenseOverviewResponse;
  lastAttemptAt?: Date;
}

@Injectable()
export class ExpenseOverviewSnapshotService {
  constructor(private readonly prismaService: PrismaService) {}

  async saveSuccessfulSnapshot(params: SaveSnapshotParams) {
    const { overview } = params;

    await this.replaceSnapshot(
      this.createSnapshotPayload({
        ...params,
        overview: { ...overview, isStale: false },
        refreshStatus: 'success',
        lastAttemptAt: params.lastAttemptAt ?? overview.lastSuccessfulRefreshAt ?? new Date(),
      }),
    );
  }

  async saveStaleSnapshot(params: SaveSnapshotParams) {
    const { overview } = params;

    await this.replaceSnapshot(
      this.createSnapshotPayload({
        ...params,
        overview: { ...overview, isStale: true },
        refreshStatus: 'stale',
        lastAttemptAt: params.lastAttemptAt ?? new Date(),
      }),
    );
  }

  async findLatestSuccessfulSnapshot(
    userId: string,
    period: ExpenseOverviewPeriod,
    range: ReturnType<typeof resolveExpensePeriodRange>,
  ): Promise<ExpenseOverviewResponse | null> {
    const snapshot = await this.getSnapshotModel().findFirst({
      where: {
        userId,
        period,
        rangeStart: range.start,
        rangeEnd: range.end,
        taxonomyVersion: EXPENSE_OVERVIEW_TAXONOMY_VERSION,
        classifierVersion: EXPENSE_OVERVIEW_CLASSIFIER_VERSION,
        lastSuccessfulRefreshAt: { not: null },
      },
      orderBy: [{ lastSuccessfulRefreshAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!snapshot) {
      return null;
    }

    return this.mapSnapshotToOverview(snapshot, true);
  }

  async findReusableSnapshot(
    userId: string,
    period: ExpenseOverviewPeriod,
    range: ReturnType<typeof resolveExpensePeriodRange>,
  ): Promise<ExpenseOverviewResponse | null> {
    const snapshot = await this.getSnapshotModel().findFirst({
      where: {
        userId,
        period,
        rangeStart: range.start,
        rangeEnd: range.end,
        taxonomyVersion: EXPENSE_OVERVIEW_TAXONOMY_VERSION,
        classifierVersion: EXPENSE_OVERVIEW_CLASSIFIER_VERSION,
        refreshStatus: 'success',
        lastSuccessfulRefreshAt: { not: null },
      },
      orderBy: [{ lastSuccessfulRefreshAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!snapshot) {
      return null;
    }

    return this.mapSnapshotToOverview(snapshot, false);
  }

  async purgeLegacySnapshots(userId?: string) {
    await this.getSnapshotModel().deleteMany({
      where: {
        ...(userId ? { userId } : {}),
        OR: [
          { taxonomyVersion: { not: EXPENSE_OVERVIEW_TAXONOMY_VERSION } },
          { classifierVersion: { not: EXPENSE_OVERVIEW_CLASSIFIER_VERSION } },
        ],
      },
    });
  }

  private createSnapshotPayload(params: SaveSnapshotParams & {
    refreshStatus: 'success' | 'stale';
    lastAttemptAt: Date;
  }) {
    const { userId, period, range, overview, refreshStatus, lastAttemptAt } = params;

    return {
      userId,
      period,
      anchorDate: this.normalizeAnchorDate(range.anchorDate),
      rangeStart: overview.range.start,
      rangeEnd: overview.range.end,
      totalAmount: BigInt(overview.totalAmount),
      taxonomyVersion: overview.taxonomyVersion,
      classifierVersion: overview.classifierVersion,
      lastSuccessfulRefreshAt: overview.lastSuccessfulRefreshAt,
      lastAttemptAt,
      refreshStatus,
      isEmpty: overview.isEmpty,
      groups: this.serializeGroups(overview.groups),
    };
  }

  private async replaceSnapshot(payload: ReturnType<typeof this.createSnapshotPayload>) {
    await this.getSnapshotModel().deleteMany({
      where: {
        userId: payload.userId,
        period: payload.period,
        OR: [
          { anchorDate: payload.anchorDate },
          {
            rangeStart: payload.rangeStart,
            rangeEnd: payload.rangeEnd,
          },
        ],
      },
    });

    await this.getSnapshotModel().create({ data: payload });
  }

  private mapSnapshotToOverview(
    snapshot: ExpenseOverviewSnapshotRecord,
    isStale: boolean,
  ): ExpenseOverviewResponse {
    return {
      period: snapshot.period,
      taxonomyVersion: snapshot.taxonomyVersion,
      classifierVersion: snapshot.classifierVersion,
      range: {
        start: snapshot.rangeStart,
        end: snapshot.rangeEnd,
      },
      totalAmount: snapshot.totalAmount,
      isEmpty: snapshot.isEmpty,
      isStale,
      lastSuccessfulRefreshAt: snapshot.lastSuccessfulRefreshAt,
      groups: this.deserializeGroups(snapshot.groups),
    };
  }

  private serializeGroups(groups: ExpenseCategorySummary[]): Prisma.JsonArray {
    return groups.map((group) => ({
      ...group,
      amount: Number(group.amount),
      latestTransactions: group.latestTransactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        happenedAt: transaction.happenedAt.toISOString(),
      })),
    })) as Prisma.JsonArray;
  }

  private deserializeGroups(groups: Prisma.JsonValue): ExpenseCategorySummary[] {
    if (!Array.isArray(groups)) {
      return [];
    }

    return groups.map((group) => {
      const summary = group as unknown as ExpenseCategorySummary & {
        latestTransactions: Array<ExpenseTransactionPreview & { happenedAt: string }>;
      };

      return {
        key: summary.key,
        label: summary.label,
        color: summary.color,
        order: summary.order,
        amount: summary.amount,
        percentage: summary.percentage,
        transactionCount: summary.transactionCount,
        latestTransactions: summary.latestTransactions.map((transaction) => ({
          id: transaction.id,
          title: transaction.title,
          amount: transaction.amount,
          happenedAt: new Date(transaction.happenedAt),
        })),
      };
    });
  }

  private normalizeAnchorDate(anchorDate: Date) {
    const normalizedAnchorDate = new Date(anchorDate);

    normalizedAnchorDate.setUTCHours(0, 0, 0, 0);

    return normalizedAnchorDate;
  }

  private getSnapshotModel() {
    return (this.prismaService as PrismaService & {
      expenseOverviewSnapshot: {
        create: (args: unknown) => Promise<unknown>;
        deleteMany: (args: unknown) => Promise<unknown>;
        findFirst: (args: unknown) => Promise<ExpenseOverviewSnapshotRecord | null>;
      };
    }).expenseOverviewSnapshot;
  }
}
