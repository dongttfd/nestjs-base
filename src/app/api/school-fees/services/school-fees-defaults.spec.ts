import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonSchoolFeesRepository } from '@/app/api/school-fees/repositories/json-school-fees.repository';
import {
  CURRENT_DEFAULTS_SEED_VERSION,
  SCHOOL_FEES_DEFAULT_TEMPLATE_NAMES,
  createSchoolFeesDefaultTemplates,
} from './school-fees-defaults';

const EXPECTED_NAMES = [
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

describe('school-fees defaults revision 2', () => {
  it('seeds exactly the 11 approved master templates', () => {
    const templates = createSchoolFeesDefaultTemplates(
      '2026-09-21T00:00:00.000Z',
    );

    expect(CURRENT_DEFAULTS_SEED_VERSION).toBe(2);
    expect([...SCHOOL_FEES_DEFAULT_TEMPLATE_NAMES]).toEqual(EXPECTED_NAMES);
    expect(templates.map((item) => item.name)).toEqual(EXPECTED_NAMES);
    expect(templates).toHaveLength(11);
    expect(new Set(templates.map((item) => item.id)).size).toBe(11);
    expect(templates.every((item) => item.active)).toBe(true);
    expect(templates.every((item) => item.type !== ('HOURLY' as never))).toBe(
      true,
    );

    expect(templates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Trang trí lớp' }),
        expect.objectContaining({ name: 'Giặt chăn, gối' }),
        expect.objectContaining({ name: 'Mua thảm' }),
        expect.objectContaining({ name: 'Mua cây' }),
      ]),
    );
  });

  it('uses the exact approved amounts and NEW/RETURNING conditions', () => {
    const templates = createSchoolFeesDefaultTemplates(
      '2026-09-21T00:00:00.000Z',
    );
    const byName = new Map(templates.map((item) => [item.name, item]));

    expect(byName.get('Phục vụ bán trú')).toMatchObject({
      type: 'MONTHLY_FIXED',
      defaultAmount: 150000,
      applicableChildStatus: null,
    });
    expect(byName.get('Quản lý học sinh ăn bán trú')).toMatchObject({
      type: 'MONTHLY_FIXED',
      defaultAmount: 150000,
      applicableChildStatus: null,
    });
    expect(byName.get('Nước')).toMatchObject({
      type: 'MONTHLY_FIXED',
      defaultAmount: 6000,
      applicableChildStatus: null,
    });
    expect(byName.get('Vệ sinh')).toMatchObject({
      type: 'MONTHLY_FIXED',
      defaultAmount: 12000,
      applicableChildStatus: null,
    });
    expect(byName.get('Đồng phục')).toMatchObject({
      type: 'ANNUAL',
      defaultAmount: 300000,
      applicableChildStatus: null,
    });
    expect(byName.get('Đồ dùng học tập')).toMatchObject({
      type: 'ANNUAL',
      defaultAmount: 300000,
      applicableChildStatus: null,
    });
    expect(byName.get('Đồ dùng bán trú - trẻ mới')).toMatchObject({
      type: 'ANNUAL',
      defaultAmount: 250000,
      applicableChildStatus: 'NEW',
    });
    expect(byName.get('Đồ dùng bán trú - trẻ cũ')).toMatchObject({
      type: 'ANNUAL',
      defaultAmount: 100000,
      applicableChildStatus: 'RETURNING',
    });
    expect(byName.get('BHTT')).toMatchObject({
      type: 'ANNUAL',
      defaultAmount: 150000,
      applicableChildStatus: null,
    });
    expect(byName.get('Thuê điều hòa')).toMatchObject({
      type: 'ANNUAL',
      defaultAmount: 234000,
      applicableChildStatus: null,
    });
  });

  it.each([
    [
      '2027-01-15T00:00:00.000Z',
      [
        '2026-09',
        '2026-10',
        '2026-11',
        '2026-12',
        '2027-01',
        '2027-02',
        '2027-03',
        '2027-04',
        '2027-05',
      ],
    ],
    [
      '2027-08-15T00:00:00.000Z',
      [
        '2026-09',
        '2026-10',
        '2026-11',
        '2026-12',
        '2027-01',
        '2027-02',
        '2027-03',
        '2027-04',
        '2027-05',
      ],
    ],
    [
      '2027-09-01T00:00:00.000Z',
      [
        '2027-09',
        '2027-10',
        '2027-11',
        '2027-12',
        '2028-01',
        '2028-02',
        '2028-03',
        '2028-04',
        '2028-05',
      ],
    ],
  ])('maps bootstrap date %s to the correct school year price map', (now, keys) => {
    const templates = createSchoolFeesDefaultTemplates(now);
    const meal = templates.find((item) => item.name === 'Ăn bán trú');

    expect(meal).toMatchObject({
      type: 'DAILY',
      applicableChildStatus: null,
    });
    if (!meal || meal.type !== 'DAILY') {
      throw new Error('Ăn bán trú must be DAILY');
    }

    expect(Object.keys(meal.priceByMonth)).toEqual(keys);
    expect(Object.values(meal.priceByMonth)).toEqual(
      keys.map(() => 20000),
    );
  });

  it('brand-new bootstrap seeds once while valid registry recovery does not reseed', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'school-fees-defaults-'));
    const configService = {
      get: (key: string, fallback?: string) =>
        key === 'schoolFeesDataDir' ? dataDir : fallback,
    } as unknown as ConfigService;
    const repository = new JsonSchoolFeesRepository(configService);

    try {
      const first = await repository.bootstrapDefaultChild();
      const firstData = await repository.readChild(first.id);
      const second = await repository.bootstrapDefaultChild();
      const secondData = await repository.readChild(second.id);

      expect(second.id).toBe(first.id);
      expect(firstData.status).toBe('NEW');
      expect(firstData.defaultsSeedVersion).toBe(2);
      expect(firstData.templates).toHaveLength(11);
      expect(secondData.templates).toEqual(firstData.templates);

      const recoveryDir = await mkdtemp(
        join(tmpdir(), 'school-fees-defaults-recovery-'),
      );
      try {
        const recoveryConfig = {
          get: (key: string, fallback?: string) =>
            key === 'schoolFeesDataDir' ? recoveryDir : fallback,
        } as unknown as ConfigService;
        const recoveryRepository = new JsonSchoolFeesRepository(recoveryConfig);
        const childId = randomUUID();

        await mkdir(join(recoveryDir, 'children'), { recursive: true });
        await writeFile(
          join(recoveryDir, 'children', `${childId}.json`),
          JSON.stringify({
            schemaVersion: 1,
            childId,
            status: 'NEW',
            defaultsSeedVersion: 2,
            templates: [],
            schoolYears: [],
          }),
          'utf8',
        );

        const recovered = await recoveryRepository.bootstrapDefaultChild();
        const recoveredData = await recoveryRepository.readChild(recovered.id);

        expect(recovered.id).toBe(childId);
        expect(recoveredData.templates).toEqual([]);
      } finally {
        await rm(recoveryDir, { recursive: true, force: true });
      }
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
