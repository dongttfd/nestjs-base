import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ChildrenRegistry,
  SchoolFeesDataFile,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  JsonSchoolFeesRepository,
  SchoolFeesRepositoryError,
} from './json-school-fees.repository';

const seededTemplateNames = [
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
];

const now = '2026-09-21T00:00:00.000Z';

describe('JsonSchoolFeesRepository', () => {
  let dataDir: string;
  let repository: JsonSchoolFeesRepository;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'school-fees-repository-'));
    const configService = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'schoolFeesDataDir' ? dataDir : fallback,
      ),
    } as unknown as ConfigService;

    repository = new JsonSchoolFeesRepository(configService);
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  const writeRegistry = async (childId: string) => {
    const registry: ChildrenRegistry = {
      schemaVersion: 1,
      defaultChildId: childId,
      children: [
        {
          id: childId,
          displayName: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    await mkdir(dataDir, { recursive: true });
    await writeFile(
      join(dataDir, 'children.json'),
      JSON.stringify(registry, null, 2),
      'utf8',
    );
  };

  const writeChild = async (
    childId: string,
    overrides: Partial<SchoolFeesDataFile> = {},
  ) => {
    const child: SchoolFeesDataFile = {
      schemaVersion: 1,
      childId,
      status: 'NEW',
      defaultsSeedVersion: 2,
      templates: [],
      schoolYears: [],
      ...overrides,
    };

    await mkdir(join(dataDir, 'children'), { recursive: true });
    await writeFile(
      join(dataDir, 'children', `${childId}.json`),
      JSON.stringify(child, null, 2),
      'utf8',
    );

    return child;
  };

  it.each(['../../etc/passwd', '%2e%2e%2f%2e%2e%2fetc%2fpasswd', 'not-a-uuid'])(
    'rejects malformed childId before path resolution: %s',
    async (childId) => {
      await expect(repository.readChild(childId)).rejects.toMatchObject({
        code: 'INVALID_CHILD_ID',
      });
    },
  );

  it('rejects a valid UUID that is not registered before reading a child file', async () => {
    const registeredChildId = randomUUID();
    const unknownChildId = randomUUID();
    await writeRegistry(registeredChildId);
    await writeChild(registeredChildId);

    // Even if an orphan file exists, membership in children.json is authoritative.
    await writeChild(unknownChildId);

    await expect(repository.readChild(unknownChildId)).rejects.toMatchObject({
      code: 'CHILD_NOT_FOUND',
    });
  });

  it('does not overwrite malformed child JSON when read fails', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    await mkdir(join(dataDir, 'children'), { recursive: true });
    const childPath = join(dataDir, 'children', `${childId}.json`);
    const malformed = '{"schemaVersion":1,"childId":';
    await writeFile(childPath, malformed, 'utf8');

    await expect(repository.readChild(childId)).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_READ_FAILED',
    });

    await expect(readFile(childPath, 'utf8')).resolves.toBe(malformed);
  });

  it('atomically persists a child mutation without leaving temp files', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    await writeChild(childId);

    await repository.mutateChild(childId, (child) => {
      child.schoolYears.push({
        id: '2026-2027',
        startMonthKey: '2026-09',
        endMonthKey: '2027-05',
        annualFees: [],
        months: {},
        createdAt: now,
        updatedAt: now,
      });

      return child;
    });

    const persisted = JSON.parse(
      await readFile(join(dataDir, 'children', `${childId}.json`), 'utf8'),
    ) as SchoolFeesDataFile;

    expect(persisted.schoolYears.map((year) => year.id)).toEqual(['2026-2027']);
    expect(
      (await readdir(join(dataDir, 'children'))).filter((name) =>
        name.includes('.tmp'),
      ),
    ).toEqual([]);
  });

  it('serializes concurrent writes for the same childId so neither update is lost', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    await writeChild(childId);

    await Promise.all([
      repository.mutateChild(childId, async (child) => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        child.schoolYears.push({
          id: '2026-2027',
          startMonthKey: '2026-09',
          endMonthKey: '2027-05',
          annualFees: [],
          months: {},
          createdAt: now,
          updatedAt: now,
        });

        return child;
      }),
      repository.mutateChild(childId, async (child) => {
        child.schoolYears.push({
          id: '2027-2028',
          startMonthKey: '2027-09',
          endMonthKey: '2028-05',
          annualFees: [],
          months: {},
          createdAt: now,
          updatedAt: now,
        });

        return child;
      }),
    ]);

    const persisted = await repository.readChild(childId);

    expect(persisted.schoolYears.map((year) => year.id).sort()).toEqual([
      '2026-2027',
      '2027-2028',
    ]);
  });

  it('concurrent first-bootstrap creates exactly one stable default child', async () => {
    const [first, second, third] = await Promise.all([
      repository.bootstrapDefaultChild(),
      repository.bootstrapDefaultChild(),
      repository.bootstrapDefaultChild(),
    ]);

    expect(new Set([first.id, second.id, third.id]).size).toBe(1);

    const registry = JSON.parse(
      await readFile(join(dataDir, 'children.json'), 'utf8'),
    ) as ChildrenRegistry;
    const childFiles = (await readdir(join(dataDir, 'children'))).filter(
      (name) => name.endsWith('.json'),
    );

    expect(registry.children).toHaveLength(1);
    expect(registry.defaultChildId).toBe(first.id);
    expect(childFiles).toEqual([`${first.id}.json`]);
  });

  it('brand-new bootstrap seeds revision 2 exactly once and restart does not duplicate it', async () => {
    const first = await repository.bootstrapDefaultChild();
    const firstData = await repository.readChild(first.id);

    expect(firstData.status).toBe('NEW');
    expect(firstData.defaultsSeedVersion).toBe(2);
    expect(firstData.schoolYears).toEqual([]);
    expect(firstData.templates.map((item) => item.name)).toEqual(
      seededTemplateNames,
    );
    expect(firstData.templates).toHaveLength(11);
    expect(new Set(firstData.templates.map((item) => item.id)).size).toBe(
      firstData.templates.length,
    );

    const second = await repository.bootstrapDefaultChild();
    const secondData = await repository.readChild(second.id);

    expect(second.id).toBe(first.id);
    expect(secondData.templates).toEqual(firstData.templates);
  });

  it('rolls back only the newly-created child when registry write fails', async () => {
    await mkdir(join(dataDir, 'children'), { recursive: true });
    const sentinelPath = join(dataDir, 'children', 'unrelated.sentinel');
    await writeFile(sentinelPath, 'keep-me', 'utf8');

    const repositoryInternals = repository as unknown as {
      atomicWriteJson: (path: string, value: unknown) => Promise<void>;
    };
    const originalAtomicWrite =
      repositoryInternals.atomicWriteJson.bind(repository);
    jest
      .spyOn(repositoryInternals, 'atomicWriteJson')
      .mockImplementation(async (path, value) => {
        if (path === join(dataDir, 'children.json')) {
          throw new SchoolFeesRepositoryError(
            'SCHOOL_FEES_DATA_WRITE_FAILED',
            'Injected registry write failure.',
          );
        }

        await originalAtomicWrite(path, value);
      });

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_WRITE_FAILED',
    });

    expect(
      (await readdir(join(dataDir, 'children'))).filter((name) =>
        name.endsWith('.json'),
      ),
    ).toEqual([]);
    await expect(readFile(sentinelPath, 'utf8')).resolves.toBe('keep-me');
  });

  it('surfaces rollback failure and never creates another child silently', async () => {
    const repositoryInternals = repository as unknown as {
      atomicWriteJson: (path: string, value: unknown) => Promise<void>;
      rollbackBootstrapChild: (path: string) => Promise<void>;
    };
    const originalAtomicWrite =
      repositoryInternals.atomicWriteJson.bind(repository);
    jest
      .spyOn(repositoryInternals, 'atomicWriteJson')
      .mockImplementation(async (path, value) => {
        if (path === join(dataDir, 'children.json')) {
          throw new SchoolFeesRepositoryError(
            'SCHOOL_FEES_DATA_WRITE_FAILED',
            'Injected registry write failure.',
          );
        }

        await originalAtomicWrite(path, value);
      });
    const rollbackFailure = jest
      .fn()
      .mockRejectedValue(
        new SchoolFeesRepositoryError(
          'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
          'Injected rollback failure.',
        ),
      );
    repositoryInternals.rollbackBootstrapChild = rollbackFailure;

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });
    expect(rollbackFailure).toHaveBeenCalledTimes(1);

    const childFilesAfterFailure = (
      await readdir(join(dataDir, 'children'))
    ).filter((name) => name.endsWith('.json'));
    expect(childFilesAfterFailure).toHaveLength(1);

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_WRITE_FAILED',
    });
    expect(
      (await readdir(join(dataDir, 'children'))).filter((name) =>
        name.endsWith('.json'),
      ),
    ).toEqual(childFilesAfterFailure);
  });

  it('rebuilds a missing registry from exactly one valid child without reseeding templates', async () => {
    const childId = randomUUID();
    await writeChild(childId, { templates: [] });

    const child = await repository.bootstrapDefaultChild();
    const recoveredData = await repository.readChild(child.id);
    const registry = JSON.parse(
      await readFile(join(dataDir, 'children.json'), 'utf8'),
    ) as ChildrenRegistry;

    expect(child.id).toBe(childId);
    expect(registry.defaultChildId).toBe(childId);
    expect(registry.children).toHaveLength(1);
    expect(recoveredData.templates).toEqual([]);
  });
  it('does not rewrite a malformed registry during bootstrap', async () => {
    await mkdir(dataDir, { recursive: true });
    const registryPath = join(dataDir, 'children.json');
    const malformed = '{"schemaVersion":1,"defaultChildId":';
    await writeFile(registryPath, malformed, 'utf8');

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_READ_FAILED',
    });
    await expect(readFile(registryPath, 'utf8')).resolves.toBe(malformed);
  });

  it('rejects missing registry recovery when multiple child files exist', async () => {
    await writeChild(randomUUID());
    await writeChild(randomUUID());

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });
  });

  it('rejects registry referencing a missing child file without recreating it', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });

    await expect(
      readFile(join(dataDir, 'children', `${childId}.json`), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects childId mismatch between registry/file name and file body', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    await writeChild(childId, { childId: randomUUID() });

    await expect(repository.readChild(childId)).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });
  });

  it('ignores orphan temp files as recovery truth', async () => {
    const childId = randomUUID();
    await mkdir(join(dataDir, 'children'), { recursive: true });
    await writeFile(
      join(dataDir, 'children', `.${childId}.json.orphan.tmp`),
      '{"orphan":true}',
      'utf8',
    );

    const resolved = await repository.bootstrapDefaultChild();
    const childFiles = await readdir(join(dataDir, 'children'));

    expect(resolved.id).not.toBe(childId);
    expect(childFiles).toContain(`${resolved.id}.json`);
    expect(childFiles).toContain(`.${childId}.json.orphan.tmp`);
  });

  it('rejects structurally invalid registry schema without rewriting it', async () => {
    const childId = randomUUID();
    const registryPath = join(dataDir, 'children.json');
    const invalid = JSON.stringify({
      schemaVersion: 999,
      defaultChildId: childId,
      children: [],
    });
    await mkdir(dataDir, { recursive: true });
    await writeFile(registryPath, invalid, 'utf8');

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });
    await expect(readFile(registryPath, 'utf8')).resolves.toBe(invalid);
  });

  it('rejects registry whose defaultChildId is not present in children', async () => {
    const childId = randomUUID();
    const otherChildId = randomUUID();
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      join(dataDir, 'children.json'),
      JSON.stringify({
        schemaVersion: 1,
        defaultChildId: otherChildId,
        children: [
          {
            id: childId,
            displayName: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
      'utf8',
    );

    await expect(repository.bootstrapDefaultChild()).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });
  });

  it('rejects child file with invalid schema before returning data', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    await mkdir(join(dataDir, 'children'), { recursive: true });
    await writeFile(
      join(dataDir, 'children', `${childId}.json`),
      JSON.stringify({
        schemaVersion: 1,
        childId,
        status: 'NEW',
        defaultsSeedVersion: 2,
        templates: 'not-an-array',
        schoolYears: [],
      }),
      'utf8',
    );

    await expect(repository.readChild(childId)).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });
  });

  it('does not persist a mutation that returns an invalid child aggregate', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    const original = await writeChild(childId);
    const childPath = join(dataDir, 'children', `${childId}.json`);

    await expect(
      repository.mutateChild(childId, (child) => ({
        ...child,
        childId: randomUUID(),
      })),
    ).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_INTEGRITY_FAILED',
    });

    const persisted = JSON.parse(
      await readFile(childPath, 'utf8'),
    ) as SchoolFeesDataFile;
    expect(persisted).toEqual(original);
  });

  it('maps non-ENOENT child read failures to SCHOOL_FEES_DATA_READ_FAILED', async () => {
    const childId = randomUUID();
    await writeRegistry(childId);
    const childPath = join(dataDir, 'children', `${childId}.json`);
    await mkdir(childPath, { recursive: true });

    await expect(repository.readChild(childId)).rejects.toMatchObject({
      code: 'SCHOOL_FEES_DATA_READ_FAILED',
    });
  });
});
