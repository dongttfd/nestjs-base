import { Prisma, PrismaClient, User } from '@prisma/client';
import * as consumptions from '@/storage/data/finance/consumption.json';
import * as investments from '@/storage/data/finance/investment.json';

const expenseOverviewConsumptionSamples = [
  {
    title: 'Bữa trưa văn phòng',
    amount: 45000,
    date: '2026-03-24T05:30:00.000Z',
  },
  {
    title: 'Đổ xăng xe máy',
    amount: 90000,
    date: '2026-03-24T11:00:00.000Z',
  },
  {
    title: 'Mua áo sơ mi',
    amount: 320000,
    date: '2026-03-25T03:00:00.000Z',
  },
  {
    title: 'Chơi game cuối tuần',
    amount: 180000,
    date: '2026-03-25T12:00:00.000Z',
  },
  {
    title: 'Tiền internet tháng 3',
    amount: 650000,
    date: '2026-03-26T02:00:00.000Z',
  },
  {
    title: 'Khám bệnh định kỳ',
    amount: 250000,
    date: '2026-03-27T01:00:00.000Z',
  },
  {
    title: 'Học phí tiếng Anh',
    amount: 1200000,
    date: '2026-03-27T08:00:00.000Z',
  },
  {
    title: 'Thẻ điện thoại',
    amount: 150000,
    date: '2026-03-28T04:00:00.000Z',
  },
  {
    title: 'Chi phí phát sinh',
    amount: 150000,
    date: '2026-03-28T06:00:00.000Z',
  },
] as const;

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
  [
    ...consumptions.map(
      (consumption): Prisma.ConsumptionCreateManyInput => ({
        userId: user.id,
        title: consumption.title,
        amount: consumption.amount,
        date: new Date(consumption.date),
        createdAt: new Date(consumption.id),
      }),
    ),
    ...expenseOverviewConsumptionSamples.map(
      (consumption, index): Prisma.ConsumptionCreateManyInput => ({
        userId: user.id,
        title: consumption.title,
        amount: consumption.amount,
        date: new Date(consumption.date),
        createdAt: new Date(`2026-03-28T10:${String(index).padStart(2, '0')}:00.000Z`),
      }),
    ),
  ];

export const seedFinance = async (prisma: PrismaClient) => {
  const firstUser = await prisma.user.findFirst();

  if (!firstUser) {
    return;
  }

  await prisma.investment.createMany({ data: readInvestmentData(firstUser) });
  await prisma.consumption.createMany({ data: readConsumptionData(firstUser) });
};
