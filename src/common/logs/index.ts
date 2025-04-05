import { LogLevel } from '@nestjs/common';
import { isProduction } from '@/common';

export const getLogLevels = (): LogLevel[] => {
  if (isProduction()) {
    return ['log', 'warn', 'error'];
  }

  return ['error', 'warn', 'log', 'verbose', 'debug'];
};

export * from './custom-logger.service';
