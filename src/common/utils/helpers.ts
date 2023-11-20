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
