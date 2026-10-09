import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  resetSchoolFeesData,
  ResetSchoolFeesDataError,
} from './reset-school-fees-data';

describe('resetSchoolFeesData', () => {
  let rootDir: string;
  let repoRoot: string;
  let backendDir: string;
  let storageParent: string;
  let dataDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'school-fees-reset-'));
    repoRoot = join(rootDir, 'repo');
    backendDir = join(repoRoot, 'backend');
    storageParent = join(backendDir, 'src', 'storage', 'data');
    dataDir = join(rootDir, 'persistent', 'school-fees');

    await mkdir(storageParent, { recursive: true });
    await mkdir(join(dataDir, 'children'), { recursive: true });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  const run = (
    overrides: Partial<Parameters<typeof resetSchoolFeesData>[0]> = {},
  ) =>
    resetSchoolFeesData({
      dataDir,
      confirmationPath: dataDir,
      backendDir,
      homeDir: homedir(),
      logger: { info: jest.fn(), error: jest.fn() },
      ...overrides,
    });

  const writeExistingData = async () => {
    await writeFile(
      join(dataDir, 'children.json'),
      JSON.stringify({ old: true }),
      'utf8',
    );
    await writeFile(
      join(dataDir, '.children.json.123.550e8400-e29b-41d4-a716-446655440000.tmp'),
      'temp',
      'utf8',
    );
    await writeFile(
      join(dataDir, '.children.json.not-exact.tmp'),
      'keep',
      'utf8',
    );
    await writeFile(join(dataDir, '.gitignore'), '*\n!.gitignore\n', 'utf8');
    await writeFile(join(dataDir, 'keep.txt'), 'keep', 'utf8');
    await writeFile(
      join(dataDir, 'children', '550e8400-e29b-41d4-a716-446655440000.json'),
      JSON.stringify({ old: true }),
      'utf8',
    );
  };

  it.each([
    ['missing target', () => ({ dataDir: undefined })],
    ['relative target', () => ({ dataDir: 'school-fees' })],
    ['missing confirmation', () => ({ confirmationPath: undefined })],
    [
      'mismatched confirmation',
      () => ({ confirmationPath: join(rootDir, 'other', 'school-fees') }),
    ],
    [
      'non school-fees basename',
      () => ({ dataDir: join(rootDir, 'school-fees-data') }),
    ],
    ['filesystem root', () => ({ dataDir: resolve('/') })],
    ['user home', () => ({ dataDir: homedir() })],
    ['repository root', () => ({ dataDir: repoRoot })],
    ['backend dir', () => ({ dataDir: backendDir })],
    ['storage parent', () => ({ dataDir: storageParent })],
    ['dangerous ancestor', () => ({ dataDir: dirname(repoRoot) })],
  ])('fails closed for %s', async (_label, buildOverrides) => {
    await writeExistingData();

    await expect(run(buildOverrides())).rejects.toBeInstanceOf(
      ResetSchoolFeesDataError,
    );

    await expect(
      readFile(join(dataDir, 'children.json'), 'utf8'),
    ).resolves.toContain('old');
    await expect(
      readFile(
        join(
          dataDir,
          'children',
          '550e8400-e29b-41d4-a716-446655440000.json',
        ),
        'utf8',
      ),
    ).resolves.toContain('old');
  });

  it('rejects a symlink target before mutation', async () => {
    const realDir = join(rootDir, 'real', 'school-fees');
    const linkDir = join(rootDir, 'linked', 'school-fees');
    await mkdir(realDir, { recursive: true });
    await mkdir(dirname(linkDir), { recursive: true });
    await symlink(realDir, linkDir);
    await writeFile(join(realDir, 'children.json'), 'old', 'utf8');

    await expect(
      run({ dataDir: linkDir, confirmationPath: linkDir }),
    ).rejects.toBeInstanceOf(ResetSchoolFeesDataError);

    await expect(readFile(join(realDir, 'children.json'), 'utf8')).resolves.toBe(
      'old',
    );
  });

  it('removes only the whitelisted runtime data and is idempotent', async () => {
    await writeExistingData();

    await expect(run()).resolves.toEqual({ dataDir: await realpath(dataDir) });

    await expect(lstat(join(dataDir, 'children'))).resolves.toMatchObject({
      isDirectory: expect.any(Function),
    });
    await expect(
      readFile(join(dataDir, '.gitignore'), 'utf8'),
    ).resolves.toContain('!.gitignore');
    await expect(readFile(join(dataDir, 'keep.txt'), 'utf8')).resolves.toBe(
      'keep',
    );
    await expect(
      readFile(join(dataDir, '.children.json.not-exact.tmp'), 'utf8'),
    ).resolves.toBe('keep');
    await expect(readFile(join(dataDir, 'children.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });

    await expect(run()).resolves.toEqual({ dataDir: await realpath(dataDir) });
  });

  it('returns a non-success error when a filesystem mutation fails', async () => {
    await writeExistingData();
    const error = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    });

    await expect(
      run({
        fileSystem: {
          rm: jest.fn(async () => {
            throw error;
          }),
        },
      }),
    ).rejects.toMatchObject({
      code: 'RESET_FILESYSTEM_FAILED',
    });
  });
});
