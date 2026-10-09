export const SCHOOL_FEES_SCHEMA_VERSION = 1 as const;

export type ChildStatus = 'NEW' | 'RETURNING';
export type FeeType = 'ANNUAL' | 'MONTHLY_FIXED' | 'DAILY';
export type PaymentStatus = 'UNPAID' | 'PAID';
export type FeeSource = 'TEMPLATE' | 'CUSTOM';

export interface ChildRegistryEntry {
  id: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChildContext extends ChildRegistryEntry {
  status: ChildStatus;
}

export interface ChildrenRegistry {
  schemaVersion: typeof SCHOOL_FEES_SCHEMA_VERSION;
  defaultChildId: string;
  children: ChildRegistryEntry[];
}

export interface FeeTemplateBase {
  id: string;
  name: string;
  type: FeeType;
  active: boolean;
  applicableChildStatus: ChildStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnualFeeTemplate extends FeeTemplateBase {
  type: 'ANNUAL';
  defaultAmount: number;
  defaultMonthOffset: number;
}

export interface MonthlyFixedFeeTemplate extends FeeTemplateBase {
  type: 'MONTHLY_FIXED';
  defaultAmount: number;
}

export interface DailyFeeTemplate extends FeeTemplateBase {
  type: 'DAILY';
  priceByMonth: Record<string, number>;
}

export type FeeTemplate =
  | AnnualFeeTemplate
  | MonthlyFixedFeeTemplate
  | DailyFeeTemplate;

export interface SchoolYearFeeItem {
  id: string;
  name: string;
  amount: number;
  assignedMonthKey: string;
  source: FeeSource;
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyFeeItemBase {
  id: string;
  type: Extract<FeeType, 'MONTHLY_FIXED' | 'DAILY'>;
  name: string;
  source: FeeSource;
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyFixedFeeItem extends MonthlyFeeItemBase {
  type: 'MONTHLY_FIXED';
  amount: number;
}

export interface DailyFeeItem extends MonthlyFeeItemBase {
  type: 'DAILY';
  unitPrice: number | null;
}

export type MonthlyFeeItem = MonthlyFixedFeeItem | DailyFeeItem;

export interface MonthlyFeePeriod {
  monthKey: string;
  paymentStatus: PaymentStatus;
  attendanceDates: string[];
  items: MonthlyFeeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SchoolYear {
  id: string;
  startMonthKey: string;
  endMonthKey: string;
  annualFees: SchoolYearFeeItem[];
  months: Record<string, MonthlyFeePeriod>;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolFeesDataFile {
  schemaVersion: typeof SCHOOL_FEES_SCHEMA_VERSION;
  childId: string;
  status: ChildStatus;
  defaultsSeedVersion: number;
  templates: FeeTemplate[];
  schoolYears: SchoolYear[];
}
