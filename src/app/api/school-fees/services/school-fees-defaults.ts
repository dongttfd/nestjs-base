import { randomUUID } from 'node:crypto';
import type {
  FeeTemplate,
} from '@/app/api/school-fees/models/school-fees.model';

export const CURRENT_DEFAULTS_SEED_VERSION = 2 as const;

export const SCHOOL_FEES_DEFAULT_TEMPLATE_NAMES = [
  'Ăn bán trú',
  'Phục vụ bán trú',
  'Quản lý học sinh ăn bán trú',
  'Nước',
  'Vệ sinh',
  'Đồng phục',
  'Đồ dùng học tập',
  'Đồ dùng bán trú - trẻ mới',
  'Đồ dùng bán trú - trẻ cũ',
  'BHTT',
  'Thuê điều hòa',
] as const;

const buildMealPriceMap = (now: string): Record<string, number> => {
  const date = new Date(now);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Thời điểm bootstrap School Fees không hợp lệ.');
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  const result: Record<string, number> = {};

  for (let academicMonth = 9; academicMonth <= 12; academicMonth += 1) {
    result[`${startYear}-${String(academicMonth).padStart(2, '0')}`] = 20000;
  }

  for (let academicMonth = 1; academicMonth <= 5; academicMonth += 1) {
    result[`${startYear + 1}-${String(academicMonth).padStart(2, '0')}`] = 20000;
  }

  return result;
};

export const createSchoolFeesDefaultTemplates = (
  now = new Date().toISOString(),
): FeeTemplate[] => [
  {
    id: randomUUID(),
    name: 'Ăn bán trú',
    type: 'DAILY',
    active: true,
    applicableChildStatus: null,
    priceByMonth: buildMealPriceMap(now),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Phục vụ bán trú',
    type: 'MONTHLY_FIXED',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 150000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Quản lý học sinh ăn bán trú',
    type: 'MONTHLY_FIXED',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 150000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Nước',
    type: 'MONTHLY_FIXED',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 6000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Vệ sinh',
    type: 'MONTHLY_FIXED',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 12000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Đồng phục',
    type: 'ANNUAL',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 300000,
    defaultMonthOffset: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Đồ dùng học tập',
    type: 'ANNUAL',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 300000,
    defaultMonthOffset: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Đồ dùng bán trú - trẻ mới',
    type: 'ANNUAL',
    active: true,
    applicableChildStatus: 'NEW',
    defaultAmount: 250000,
    defaultMonthOffset: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Đồ dùng bán trú - trẻ cũ',
    type: 'ANNUAL',
    active: true,
    applicableChildStatus: 'RETURNING',
    defaultAmount: 100000,
    defaultMonthOffset: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'BHTT',
    type: 'ANNUAL',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 150000,
    defaultMonthOffset: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    name: 'Thuê điều hòa',
    type: 'ANNUAL',
    active: true,
    applicableChildStatus: null,
    defaultAmount: 234000,
    defaultMonthOffset: 0,
    createdAt: now,
    updatedAt: now,
  },
];
