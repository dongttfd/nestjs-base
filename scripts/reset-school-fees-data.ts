import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import {
  resetSchoolFeesData,
  ResetSchoolFeesDataError,
} from '../src/app/api/school-fees/tools/reset-school-fees-data';
import { configApp } from '../src/config/app';

async function main(): Promise<void> {
  const backendDir = resolve(__dirname, '..');

  try {
    loadEnvFile(resolve(backendDir, '.env'));
  } catch (error) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      (error as NodeJS.ErrnoException).code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const appConfig = configApp();

  await resetSchoolFeesData({
    dataDir: appConfig.schoolFeesDataDir,
    confirmationPath: appConfig.schoolFeesDataDir,
    backendDir,
  });
}

main().catch((error: unknown) => {
  if (error instanceof ResetSchoolFeesDataError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error('School Fees reset failed.', error);
  }

  process.exitCode = 1;
});
