import * as fns from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { LogType } from '@/config';

export class CustomLogger {
  success(message: string) {
    return this.logMessage(LogType.INFO, message);
  }

  error(message: string) {
    return this.logMessage(LogType.ERROR, message);
  }

  private baseLog(type: string) {
    return `[${type}]${fns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')} `;
  }

  private logMessage(type: LogType, message = '') {
    return this.runLog(type, message, 'requests');
  }

  private runLog(type: LogType, message = '', folder = 'requests') {
    const logPath = process.env.STORAGE_LOG
      ? process.env.STORAGE_LOG
      : `${path.resolve(__dirname, '..', '..', '..')}/logs/${folder}`;

    return fs.appendFileSync(
      `${logPath}/${fns.format(new Date(), 'yyyy-MM-dd')}.log`,
      this.baseLog(type) + message + '\n',
    );
  }
}
