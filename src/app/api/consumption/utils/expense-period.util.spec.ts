import { resolveExpensePeriodRange } from '@/app/api/consumption/utils/expense-period.util';

describe('resolveExpensePeriodRange', () => {
  it('resolves ISO week from Monday to Sunday', () => {
    const range = resolveExpensePeriodRange('week', new Date('2026-03-28T10:30:00.000Z'));

    expect(range.start.getDay()).toBe(1);
    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.end.getDay()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
  });

  it('resolves month boundaries from anchor date', () => {
    const range = resolveExpensePeriodRange('month', new Date('2026-03-28T10:30:00.000Z'));

    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(2);
    expect(range.start.getDate()).toBe(1);
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(2);
    expect(range.end.getDate()).toBe(31);
    expect(range.end.getHours()).toBe(23);
  });

  it('resolves year boundaries from anchor date', () => {
    const range = resolveExpensePeriodRange('year', new Date('2026-03-28T10:30:00.000Z'));

    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(0);
    expect(range.start.getDate()).toBe(1);
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(11);
    expect(range.end.getDate()).toBe(31);
    expect(range.end.getHours()).toBe(23);
  });
});
