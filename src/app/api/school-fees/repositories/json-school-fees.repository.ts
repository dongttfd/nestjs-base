import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import {
  ChildContext,
  ChildRegistryEntry,
  ChildrenRegistry,
  SchoolFeesDataFile,
  SCHOOL_FEES_SCHEMA_VERSION,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  CURRENT_DEFAULTS_SEED_VERSION,
  createSchoolFeesDefaultTemplates,
} from '@/app/api/school-fees/services/school-fees-defaults';

export type SchoolFeesRepositoryErrorCode =
  | 'INVALID_CHILD_ID'
  | 'CHILD_NOT_FOUND'
  | 'SCHOOL_FEES_DATA_READ_FAILED'
  | 'SCHOOL_FEES_DATA_WRITE_FAILED'
  | 'SCHOOL_FEES_DATA_INTEGRITY_FAILED';

export class SchoolFeesRepositoryError extends Error {
  constructor(
    public readonly code: SchoolFeesRepositoryErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
    this.name = 'SchoolFeesRepositoryError';
  }
}

type ChildMutator = (
  child: SchoolFeesDataFile,
) => SchoolFeesDataFile | Promise<SchoolFeesDataFile>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class JsonSchoolFeesRepository {
  private readonly dataDir: string;
  private readonly childrenDir: string;
  private readonly registryPath: string;
  private registryTail: Promise<void> = Promise.resolve();
  private readonly childTails = new Map<string, Promise<void>>();

  constructor(private readonly configService: ConfigService) {
    this.dataDir = resolve(
      this.configService.get<string>(
        'schoolFeesDataDir',
        'src/storage/data/school-fees',
      ),
    );
    this.childrenDir = resolve(this.dataDir, 'children');
    this.registryPath = resolve(this.dataDir, 'children.json');
  }

  async bootstrapDefaultChild(): Promise<ChildContext> {
    const existing = await this.readRegistryIfExists();

    if (existing) {
      return this.resolveDefaultContext(existing);
    }

    return this.withRegistryLock(async () => {
      const doubleChecked = await this.readRegistryIfExists();

      if (doubleChecked) {
        return this.resolveDefaultContext(doubleChecked);
      }

      await mkdir(this.childrenDir, { recursive: true });
      const candidates = await this.listChildJsonFiles();

      if (candidates.length > 1) {
        throw new SchoolFeesRepositoryError(
          'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
          'Không thể khôi phục registry vì có nhiều child file.',
        );
      }

      if (candidates.length === 1) {
        const child = await this.readChildFileWithoutRegistry(candidates[0]);
        const now = new Date().toISOString();
        const registryEntry: ChildRegistryEntry = {
          id: child.childId,
          displayName: null,
          createdAt: now,
          updatedAt: now,
        };
        const registry: ChildrenRegistry = {
          schemaVersion: SCHOOL_FEES_SCHEMA_VERSION,
          defaultChildId: child.childId,
          children: [registryEntry],
        };

        await this.atomicWriteJson(this.registryPath, registry);

        return { ...registryEntry, status: child.status };
      }

      const now = new Date().toISOString();
      const childId = randomUUID();
      const registryEntry: ChildRegistryEntry = {
        id: childId,
        displayName: null,
        createdAt: now,
        updatedAt: now,
      };
      const child: SchoolFeesDataFile = {
        schemaVersion: SCHOOL_FEES_SCHEMA_VERSION,
        childId,
        status: 'NEW',
        defaultsSeedVersion: CURRENT_DEFAULTS_SEED_VERSION,
        templates: createSchoolFeesDefaultTemplates(now),
        schoolYears: [],
      };
      const registry: ChildrenRegistry = {
        schemaVersion: SCHOOL_FEES_SCHEMA_VERSION,
        defaultChildId: childId,
        children: [registryEntry],
      };

      const newChildPath = this.childPath(childId);
      await this.atomicWriteJson(newChildPath, child);

      try {
        await this.atomicWriteJson(this.registryPath, registry);
      } catch (registryWriteError) {
        try {
          await this.rollbackBootstrapChild(newChildPath);
        } catch (rollbackError) {
          throw new SchoolFeesRepositoryError(
            'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
            'Không thể rollback child sau khi ghi registry thất bại.',
            { cause: { registryWriteError, rollbackError } },
          );
        }

        throw registryWriteError;
      }

      return { ...registryEntry, status: child.status };
    });
  }

  async resolveChildContext(childId: string): Promise<ChildContext> {
    this.assertUuid(childId);
    const registry = await this.readRegistryRequired();
    this.assertRegistryMembership(registry, childId);
    const entry = registry.children.find((child) => child.id === childId);

    if (!entry) {
      throw new SchoolFeesRepositoryError(
        'CHILD_NOT_FOUND',
        'childId không tồn tại trong registry.',
      );
    }

    const child = await this.readChildFile(this.childPath(childId), childId);

    return { ...entry, status: child.status };
  }

  async readChild(childId: string): Promise<SchoolFeesDataFile> {
    this.assertUuid(childId);
    const registry = await this.readRegistryRequired();
    this.assertRegistryMembership(registry, childId);
    const path = this.childPath(childId);
    const child = await this.readChildFile(path, childId);

    return this.clone(child);
  }

  async mutateChild(
    childId: string,
    mutator: ChildMutator,
  ): Promise<SchoolFeesDataFile> {
    this.assertUuid(childId);

    return this.withChildLock(childId, async () => {
      const registry = await this.readRegistryRequired();
      this.assertRegistryMembership(registry, childId);
      const path = this.childPath(childId);
      const current = await this.readChildFile(path, childId);
      const workingCopy = this.clone(current);
      const mutated = await mutator(workingCopy);

      this.assertChildFile(mutated, childId);
      await this.atomicWriteJson(path, mutated);

      return this.clone(mutated);
    });
  }

  private async resolveDefaultContext(
    registry: ChildrenRegistry,
  ): Promise<ChildContext> {
    const context = registry.children.find(
      (child) => child.id === registry.defaultChildId,
    );

    if (!context) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
        'defaultChildId không tồn tại trong registry.',
      );
    }

    // Validate that the referenced aggregate really exists and compose business
    // state from the authoritative child aggregate.
    const child = await this.readChildFile(
      this.childPath(context.id),
      context.id,
    );

    return { ...context, status: child.status };
  }

  private assertUuid(childId: string): void {
    if (!UUID_PATTERN.test(childId)) {
      throw new SchoolFeesRepositoryError(
        'INVALID_CHILD_ID',
        'childId không phải UUID hợp lệ.',
      );
    }
  }

  private assertRegistryMembership(
    registry: ChildrenRegistry,
    childId: string,
  ): void {
    if (!registry.children.some((child) => child.id === childId)) {
      throw new SchoolFeesRepositoryError(
        'CHILD_NOT_FOUND',
        'childId không tồn tại trong registry.',
      );
    }
  }

  private childPath(childId: string): string {
    this.assertUuid(childId);

    const path = resolve(this.childrenDir, `${childId}.json`);
    const prefix = this.childrenDir.endsWith(sep)
      ? this.childrenDir
      : `${this.childrenDir}${sep}`;

    if (!path.startsWith(prefix)) {
      throw new SchoolFeesRepositoryError(
        'INVALID_CHILD_ID',
        'Đường dẫn child nằm ngoài thư mục được phép.',
      );
    }

    return path;
  }

  private async readRegistryRequired(): Promise<ChildrenRegistry> {
    const registry = await this.readRegistryIfExists();

    if (!registry) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_READ_FAILED',
        'Không tìm thấy children.json.',
      );
    }

    return registry;
  }

  private async readRegistryIfExists(): Promise<ChildrenRegistry | null> {
    let raw: string;

    try {
      raw = await readFile(this.registryPath, 'utf8');
    } catch (error) {
      if (this.isNodeError(error, 'ENOENT')) {
        return null;
      }

      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_READ_FAILED',
        'Không thể đọc children.json.',
        { cause: error },
      );
    }

    let value: unknown;

    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_READ_FAILED',
        'children.json không phải JSON hợp lệ.',
        { cause: error },
      );
    }

    if (!this.isChildrenRegistry(value)) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
        'children.json không đúng schema School Fees.',
      );
    }

    if (!value.children.some((child) => child.id === value.defaultChildId)) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
        'defaultChildId không tồn tại trong children[].',
      );
    }

    return value;
  }

  private async readChildFile(
    path: string,
    expectedChildId: string,
  ): Promise<SchoolFeesDataFile> {
    let raw: string;

    try {
      raw = await readFile(path, 'utf8');
    } catch (error) {
      throw new SchoolFeesRepositoryError(
        this.isNodeError(error, 'ENOENT')
          ? 'SCHOOL_FEES_DATA_INTEGRITY_FAILED'
          : 'SCHOOL_FEES_DATA_READ_FAILED',
        this.isNodeError(error, 'ENOENT')
          ? 'Registry tham chiếu child file không tồn tại.'
          : 'Không thể đọc child file.',
        { cause: error },
      );
    }

    let value: unknown;

    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_READ_FAILED',
        'Child file không phải JSON hợp lệ.',
        { cause: error },
      );
    }

    this.assertChildFile(value, expectedChildId);

    return value;
  }

  private async readChildFileWithoutRegistry(
    fileName: string,
  ): Promise<SchoolFeesDataFile> {
    const childId = fileName.slice(0, -'.json'.length);
    this.assertUuid(childId);

    return this.readChildFile(this.childPath(childId), childId);
  }

  private assertChildFile(
    value: unknown,
    expectedChildId: string,
  ): asserts value is SchoolFeesDataFile {
    if (!this.isSchoolFeesDataFile(value)) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
        'Child file không đúng schema School Fees.',
      );
    }

    if (value.childId !== expectedChildId) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
        'childId trong file không khớp registry/tên file.',
      );
    }
  }

  private isChildrenRegistry(value: unknown): value is ChildrenRegistry {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const registry = value as Partial<ChildrenRegistry>;

    return (
      registry.schemaVersion === SCHOOL_FEES_SCHEMA_VERSION &&
      typeof registry.defaultChildId === 'string' &&
      this.isUuid(registry.defaultChildId) &&
      Array.isArray(registry.children) &&
      registry.children.every((child) => this.isChildRegistryEntry(child))
    );
  }

  private isChildRegistryEntry(value: unknown): value is ChildRegistryEntry {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const child = value as Partial<ChildRegistryEntry>;

    return (
      typeof child.id === 'string' &&
      this.isUuid(child.id) &&
      (child.displayName === null || typeof child.displayName === 'string') &&
      typeof child.createdAt === 'string' &&
      typeof child.updatedAt === 'string'
    );
  }

  private isSchoolFeesDataFile(value: unknown): value is SchoolFeesDataFile {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const child = value as Partial<SchoolFeesDataFile>;

    return (
      child.schemaVersion === SCHOOL_FEES_SCHEMA_VERSION &&
      typeof child.childId === 'string' &&
      this.isUuid(child.childId) &&
      (child.status === 'NEW' || child.status === 'RETURNING') &&
      Number.isInteger(child.defaultsSeedVersion) &&
      (child.defaultsSeedVersion as number) >= 1 &&
      Array.isArray(child.templates) &&
      Array.isArray(child.schoolYears)
    );
  }

  private isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
  }

  private async listChildJsonFiles(): Promise<string[]> {
    let entries;

    try {
      entries = await readdir(this.childrenDir, { withFileTypes: true });
    } catch (error) {
      if (this.isNodeError(error, 'ENOENT')) {
        return [];
      }

      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_READ_FAILED',
        'Không thể đọc thư mục children.',
        { cause: error },
      );
    }

    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith('.json') &&
          this.isUuid(entry.name.slice(0, -'.json'.length)),
      )
      .map((entry) => entry.name)
      .sort();
  }

  private async atomicWriteJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const tempPath = resolve(
      dirname(path),
      `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`,
    );
    let handle;

    try {
      handle = await open(tempPath, 'wx');
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(tempPath, path);
    } catch (error) {
      if (handle) {
        await handle.close().catch(() => undefined);
      }
      await rm(tempPath, { force: true }).catch(() => undefined);

      if (error instanceof SchoolFeesRepositoryError) {
        throw error;
      }

      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_WRITE_FAILED',
        'Không thể ghi dữ liệu School Fees.',
        { cause: error },
      );
    }
  }

  private async rollbackBootstrapChild(path: string): Promise<void> {
    try {
      await rm(path);
    } catch (error) {
      throw new SchoolFeesRepositoryError(
        'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
        'Không thể xóa child file mới sau khi bootstrap thất bại.',
        { cause: error },
      );
    }
  }

  private async withRegistryLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.registryTail.catch(() => undefined);
    let release!: () => void;
    const current = new Promise<void>((resolveCurrent) => {
      release = resolveCurrent;
    });
    this.registryTail = previous.then(() => current);

    await previous;

    try {
      return await work();
    } finally {
      release();
    }
  }

  private async withChildLock<T>(
    childId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const previous = (this.childTails.get(childId) ?? Promise.resolve()).catch(
      () => undefined,
    );
    let release!: () => void;
    const current = new Promise<void>((resolveCurrent) => {
      release = resolveCurrent;
    });
    const tail = previous.then(() => current);
    this.childTails.set(childId, tail);

    await previous;

    try {
      return await work();
    } finally {
      release();
      if (this.childTails.get(childId) === tail) {
        this.childTails.delete(childId);
      }
    }
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }

  private isNodeError(
    error: unknown,
    code: string,
  ): error is NodeJS.ErrnoException {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === code
    );
  }
}
