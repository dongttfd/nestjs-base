import { isEqual } from 'date-fns';
import { Environment } from '@/config';

export const isProduction = () =>
  process.env.NODE_ENV === Environment.PRODUCTION;
export const isDevelopment = () =>
  process.env.NODE_ENV === Environment.DEVELOPMENT;
export const isStaging = () => process.env.NODE_ENV === Environment.STAGING;
export const isTesting = () => process.env.NODE_ENV === Environment.TESTING;

export const getJwtFromRequest = (req: Request) => {
  return req.headers['authorization']?.split(' ')[1] || null;
};

// check ensure date with string type is date and return date else return undefined
export const ensureDate = (date?: Date) => {
  const dateObj = new Date(date);

  return isNaN(dateObj.getTime()) ? undefined : dateObj;
};
export const sameDate = (first: Date | string, second: Date | string) => {
  return isEqual(
    (new Date(first)).setHours(0, 0, 0, 0),
    (new Date(second)).setHours(0, 0, 0, 0)
  );
};
export const sameMonth = (first: Date | string, second: Date | string) => {
  const firstMonth = (new Date(first)).setDate(1);
  const secondMonth = (new Date(second)).setDate(1);

  return isEqual(
    (new Date(firstMonth)).setHours(0, 0, 0, 0),
    (new Date(secondMonth)).setHours(0, 0, 0, 0)
  );
};
