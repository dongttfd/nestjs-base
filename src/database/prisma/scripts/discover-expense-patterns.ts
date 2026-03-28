import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { normalizeExpenseClassificationText } from '@/app/api/consumption/utils/expense-classifier-normalizer.util';

const prisma = new PrismaClient();
const DISCOVERY_CUTOFF = new Date('2023-04-01T00:00:00.000Z');
const DEFAULT_LIMIT = 200;

const main = async () => {
  const rows = await prisma.consumption.findMany({
    where: {
      amount: { gt: BigInt(0) },
      date: { lt: DISCOVERY_CUTOFF },
    },
    select: {
      title: true,
      amount: true,
      date: true,
    },
    orderBy: [{ date: 'desc' }],
  });

  const aggregated = rows.reduce(
    (result, row) => {
      const normalizedTitle = normalizeExpenseClassificationText(row.title);

      if (!normalizedTitle) {
        return result;
      }

      const current = result.get(normalizedTitle) ?? {
        normalizedTitle,
        count: 0,
        totalAmount: BigInt(0),
        samples: new Set<string>(),
      };

      current.count += 1;
      current.totalAmount += BigInt(row.amount);

      if (current.samples.size < 5) {
        current.samples.add(row.title);
      }

      result.set(normalizedTitle, current);

      return result;
    },
    new Map<
      string,
      {
        normalizedTitle: string;
        count: number;
        totalAmount: bigint;
        samples: Set<string>;
      }
    >(),
  );

  const payload = Array.from(aggregated.values())
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return Number(right.totalAmount - left.totalAmount);
    })
    .slice(0, DEFAULT_LIMIT)
    .map((row) => ({
      normalizedTitle: row.normalizedTitle,
      count: row.count,
      totalAmount: row.totalAmount.toString(),
      samples: Array.from(row.samples.values()),
    }));

  process.stdout.write(
    `${JSON.stringify({ cutoff: DISCOVERY_CUTOFF.toISOString(), payload }, null, 2)}\n`,
  );
};

main()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
