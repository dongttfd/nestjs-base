import { Prisma, PrismaClient, User } from '@prisma/client';
import * as consumptions from '@/storage/data/finance/consumption.json';
import * as investments from '@/storage/data/finance/investment.json';

const readInvestmentData = (user: User) =>
  investments.map(
    (investment): Prisma.InvestmentCreateInput => ({
      userId: user.id,
      title: investment.title,
      amount: investment.amount,
      date: new Date(investment.date),
      createdAt: new Date(investment.id),
    }),
  );
const readConsumptionData = (user: User) =>
  consumptions.map(
    (consumption): Prisma.InvestmentCreateInput => ({
      userId: user.id,
      title: consumption.title,
      amount: consumption.amount,
      date: new Date(consumption.date),
      createdAt: new Date(consumption.id),
    }),
  );

export const seedFinance = async (prisma: PrismaClient) => {
  const firstUser = await prisma.user.findFirst();
  await prisma.investment.createMany({ data: readInvestmentData(firstUser) });
  await prisma.consumption.createMany({ data: readConsumptionData(firstUser) });
};
