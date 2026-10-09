import {
  lstat,
  mkdir,
  readdir,
  realpath,
  rm,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  resolve,
  sep,
} from 'node:path';

export type ResetSchoolFeesDataErrorCode =
  | 'RESET_INVALID_TARGET'
  | 'RESET_CONFIRMATION_MISMATCH'
  | 'RESET_FILESYSTEM_FAILED';

export class ResetSchoolFeesDataError extends Error {
  constructor(
    public readonly code: ResetSchoolFeesDataErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'ResetSchoolFeesDataError';
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

interface ResetSchoolFeesLogger {
  info(message: string): void;
  error(message: string): void;
}

interface ResetSchoolFeesFileSystem {
  lstat: typeof lstat;
  mkdir: typeof mkdir;
  readdir: typeof readdir;
  realpath: typeof realpath;
  rm: typeof rm;
}

export interface ResetSchoolFeesDataOptions {
  dataDir?: string;
  confirmationPath?: string;
  backendDir?: string;
  homeDir?: string;
  logger?: ResetSchoolFeesLogger;
  fileSystem?: Partial<ResetSchoolFeesFileSystem>;
}

const DEFAULT_FILE_SYSTEM: ResetSchoolFeesFileSystem = {
  lstat,
  mkdir,
  readdir,
  realpath,
  rm,
};

const REGISTRY_TEMP_PATTERN =
  /^\.children\.json\.\d+\.[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/i;

const isNodeError = (
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as NodeJS.ErrnoException).code === code;

const isSamePath = (left: string, right: string): boolean =>
  resolve(left) === resolve(right);

const isAncestorOf = (ancestor: string, candidate: string): boolean => {
  const normalizedAncestor = resolve(ancestor);
  const normalizedCandidate = resolve(candidate);
  const prefix = normalizedAncestor.endsWith(sep)
    ? normalizedAncestor
    : `${normalizedAncestor}${sep}`;

  return (
    normalizedCandidate === normalizedAncestor ||
    normalizedCandidate.startsWith(prefix)
  );
};

export const resetSchoolFeesData = async (
  options: ResetSchoolFeesDataOptions = {},
): Promise<{ dataDir: string }> => {
  const fs = { ...DEFAULT_FILE_SYSTEM, ...options.fileSystem };
  const logger = options.logger ?? console;
  const rawDataDir = options.dataDir?.trim();
  const rawConfirmation = options.confirmationPath?.trim();

  if (!rawDataDir || !isAbsolute(rawDataDir)) {
    throw new ResetSchoolFeesDataError(
      'RESET_INVALID_TARGET',
      'SCHOOL_FEES_DATA_DIR bắt buộc phải là absolute path.',
    );
  }

  if (!rawConfirmation || !isAbsolute(rawConfirmation)) {
    throw new ResetSchoolFeesDataError(
      'RESET_CONFIRMATION_MISMATCH',
      'CONFIRM_SCHOOL_FEES_RESET_PATH bắt buộc phải là absolute path.',
    );
  }

  const requestedTarget = resolve(rawDataDir);
  const normalizedConfirmation = resolve(rawConfirmation);
  const backendDir = resolve(options.backendDir ?? process.cwd());
  const repositoryRoot = dirname(backendDir);
  const storageParent = resolve(backendDir, 'src/storage/data');
  const home = resolve(options.homeDir ?? homedir());

  let target: string;

  try {
    try {
      const stat = await fs.lstat(requestedTarget);

      if (stat.isSymbolicLink()) {
        throw new ResetSchoolFeesDataError(
          'RESET_INVALID_TARGET',
          'School Fees reset target không được là symlink.',
        );
      }

      if (!stat.isDirectory()) {
        throw new ResetSchoolFeesDataError(
          'RESET_INVALID_TARGET',
          'School Fees reset target phải là thư mục.',
        );
      }

      target = await fs.realpath(requestedTarget);
    } catch (error) {
      if (error instanceof ResetSchoolFeesDataError) {
        throw error;
      }

      if (!isNodeError(error, 'ENOENT')) {
        throw error;
      }

      const requestedParent = dirname(requestedTarget);
      const canonicalParent = await fs.realpath(requestedParent);
      target = join(canonicalParent, basename(requestedTarget));
    }
  } catch (error) {
    if (error instanceof ResetSchoolFeesDataError) {
      throw error;
    }

    throw new ResetSchoolFeesDataError(
      'RESET_FILESYSTEM_FAILED',
      'Không thể xác thực School Fees reset target.',
      { cause: error },
    );
  }

  if (!isSamePath(normalizedConfirmation, requestedTarget)) {
    throw new ResetSchoolFeesDataError(
      'RESET_CONFIRMATION_MISMATCH',
      'CONFIRM_SCHOOL_FEES_RESET_PATH không khớp chính xác reset target.',
    );
  }

  if (basename(target) !== 'school-fees') {
    throw new ResetSchoolFeesDataError(
      'RESET_INVALID_TARGET',
      'Reset target phải có basename là school-fees.',
    );
  }

  const root = parse(target).root;
  const bannedExactPaths = [
    root,
    home,
    repositoryRoot,
    backendDir,
    storageParent,
  ];

  if (bannedExactPaths.some((path) => isSamePath(target, path))) {
    throw new ResetSchoolFeesDataError(
      'RESET_INVALID_TARGET',
      'Reset target trùng với một thư mục hệ thống/project bị cấm.',
    );
  }

  if (
    [repositoryRoot, backendDir, storageParent].some((protectedPath) =>
      isAncestorOf(target, protectedPath),
    )
  ) {
    throw new ResetSchoolFeesDataError(
      'RESET_INVALID_TARGET',
      'Reset target là ancestor của thư mục project/storage được bảo vệ.',
    );
  }

  logger.info(`School Fees reset target: ${target}`);

  try {
    await fs.mkdir(target, { recursive: true });
    const entries = await fs.readdir(target, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'children.json') {
        await fs.rm(join(target, entry.name), { force: true });
        continue;
      }

      if (entry.name === 'children') {
        await fs.rm(join(target, entry.name), {
          recursive: true,
          force: true,
        });
        continue;
      }

      if (REGISTRY_TEMP_PATTERN.test(entry.name)) {
        await fs.rm(join(target, entry.name), { force: true });
      }
    }

    await fs.mkdir(join(target, 'children'), { recursive: true });
  } catch (error) {
    logger.error(`School Fees reset failed for target: ${target}`);
    throw new ResetSchoolFeesDataError(
      'RESET_FILESYSTEM_FAILED',
      'Không thể reset School Fees data.',
      { cause: error },
    );
  }

  logger.info(`School Fees reset completed: ${target}`);

  return { dataDir: target };
};
