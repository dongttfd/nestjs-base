import type {
  ChildStatus,
  FeeTemplate,
} from '@/app/api/school-fees/models/school-fees.model';
import {
  SchoolFeesTemplateEligibilityError,
  SchoolFeesTemplateEligibilityService,
} from './school-fees-template-eligibility.service';

const now = '2026-10-05T00:00:00.000Z';

const annual = (
  id: string,
  condition: ChildStatus | null,
  active = true,
): FeeTemplate => ({
  id,
  name: id,
  type: 'ANNUAL',
  active,
  applicableChildStatus: condition,
  defaultAmount: 1,
  defaultMonthOffset: 0,
  createdAt: now,
  updatedAt: now,
});

describe('SchoolFeesTemplateEligibilityService', () => {
  const service = new SchoolFeesTemplateEligibilityService();

  it.each([
    ['NEW', ['new', 'neutral']],
    ['RETURNING', ['returning', 'neutral']],
  ] as const)('filters active eligible templates for %s', (status, expectedIds) => {
    const templates: FeeTemplate[] = [
      annual('new', 'NEW'),
      annual('returning', 'RETURNING'),
      annual('neutral', null),
      annual('inactive', null, false),
    ];

    expect(
      service
        .filterEligible(templates, status)
        .map((template) => template.id),
    ).toEqual(expectedIds);
  });

  it.each([
    ['missing', [annual('new', 'NEW')], ['missing'], 'NEW', ['ANNUAL']],
    ['inactive', [annual('inactive', 'NEW', false)], ['inactive'], 'NEW', ['ANNUAL']],
    ['status mismatch', [annual('returning', 'RETURNING')], ['returning'], 'NEW', ['ANNUAL']],
    [
      'wrong type',
      [
        {
          id: 'monthly',
          name: 'monthly',
          type: 'MONTHLY_FIXED',
          active: true,
          applicableChildStatus: null,
          defaultAmount: 1,
          createdAt: now,
          updatedAt: now,
        } as FeeTemplate,
      ],
      ['monthly'],
      'NEW',
      ['ANNUAL'],
    ],
  ] as const)(
    'rejects %s as FEE_TEMPLATE_NOT_ELIGIBLE',
    (_label, templates, ids, status, allowedTypes) => {
      expect(() =>
        service.resolveEligibleByIds(
          [...templates] as FeeTemplate[],
          [...ids],
          status as ChildStatus,
          [...allowedTypes],
        ),
      ).toThrow(
        expect.objectContaining({
          code: 'FEE_TEMPLATE_NOT_ELIGIBLE',
        }) as SchoolFeesTemplateEligibilityError,
      );
    },
  );

  it('returns selected templates in submitted order when all are eligible', () => {
    const templates = [
      annual('neutral', null),
      annual('new', 'NEW'),
      annual('other', 'RETURNING'),
    ];

    expect(
      service
        .resolveEligibleByIds(
          templates,
          ['new', 'neutral'],
          'NEW',
          ['ANNUAL'],
        )
        .map((template) => template.id),
    ).toEqual(['new', 'neutral']);
  });
});
