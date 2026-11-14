import { describe, expect, it } from 'vitest';
import {
  computeBadges,
  computeStreak,
} from '../src/features/customer/rewards/badgesModel';
import type { VisitSnapshot } from '../src/features/customer/shared/visit';

let counter = 0;
function visit(overrides: Partial<VisitSnapshot> = {}): VisitSnapshot {
  counter += 1;
  return {
    sessionId: `s${counter}`,
    venueId: 'grind',
    venueName: 'The Grind Co-Work',
    seatId: 'grind-seat-1',
    seatLabel: 'Seat 1',
    seatKind: 'desk',
    mode: 'METERED_OPEN',
    minutes: 30,
    time: 15000,
    items: 0,
    total: 15000,
    orders: [],
    ...overrides,
  };
}
const many = (n: number, overrides: Partial<VisitSnapshot> = {}) =>
  Array.from({ length: n }, () => visit(overrides));
const badge = (visits: VisitSnapshot[], id: string) => {
  const found = computeBadges(visits).find((entry) => entry.id === id);
  if (!found) throw new Error(`no badge ${id}`);
  return found;
};

describe('badges', () => {
  it('starts with everything locked and 0 progress', () => {
    const badges = computeBadges([]);
    expect(badges).toHaveLength(7);
    expect(badges.every((entry) => !entry.earned && entry.current === 0)).toBe(
      true,
    );
    expect(badge([], 'regular').progressText).toBe('0 / 5 visits');
  });
  it('awards First visit and shows Regular progress', () => {
    const visits = many(3);
    expect(badge(visits, 'first-visit').earned).toBe(true);
    expect(badge(visits, 'regular')).toMatchObject({
      earned: false,
      progressText: '3 / 5 visits',
    });
    expect(badge(many(5), 'regular').earned).toBe(true);
    expect(badge(many(7), 'regular').progressText).toBe('5 / 5 visits');
  });
  it('Deep worker needs one visit of 240 minutes', () => {
    expect(badge([visit({ minutes: 239 })], 'deep-worker').earned).toBe(false);
    expect(badge([visit({ minutes: 240 })], 'deep-worker').earned).toBe(true);
    // Two long visits that add up do not count.
    expect(badge(many(2, { minutes: 150 }), 'deep-worker')).toMatchObject({
      earned: false,
      current: 150,
    });
  });
  it('Marathon sums total time to 20 hours', () => {
    expect(badge(many(4, { minutes: 299 }), 'marathon').earned).toBe(false);
    expect(badge(many(4, { minutes: 300 }), 'marathon').earned).toBe(true);
    expect(badge([visit({ minutes: 90 })], 'marathon').progressText).toBe(
      '1.5 / 20 h in total',
    );
  });
  it('Explorer needs desk, booth and pod', () => {
    const kinds = [
      visit({ seatKind: 'desk' }),
      visit({ seatKind: 'desk' }),
      visit({ seatKind: 'pod' }),
    ];
    expect(badge(kinds, 'explorer')).toMatchObject({
      earned: false,
      progressText: '2 / 3 seat types',
    });
    expect(
      badge([...kinds, visit({ seatKind: 'booth' })], 'explorer').earned,
    ).toBe(true);
  });
  it('Snack lover counts item quantities', () => {
    const order = (quantity: number) => ({
      name: 'Croissant',
      unitPrice: 35000,
      quantity,
    });
    expect(badge([visit({ orders: [order(4)] })], 'snack-lover')).toMatchObject(
      { earned: false, progressText: '4 / 5 items' },
    );
    expect(
      badge(
        [visit({ orders: [order(2)] }), visit({ orders: [order(3)] })],
        'snack-lover',
      ).earned,
    ).toBe(true);
  });
  it('has no time-of-day badges', () => {
    const ids = computeBadges([]).map((entry) => entry.id);
    expect(ids.join(' ')).not.toMatch(/night|early/);
  });
});

describe('streak', () => {
  const run = (minutes: number[]) =>
    computeStreak(minutes.map((m) => visit({ minutes: m })));
  it('is empty without visits', () => {
    expect(run([])).toEqual({ current: 0, best: 0 });
  });
  it('counts consecutive visits of 60+ minutes in order', () => {
    expect(run([60, 90, 120])).toEqual({ current: 3, best: 3 });
  });
  it('resets on a short visit and keeps the best run', () => {
    expect(run([60, 60, 59, 70])).toEqual({ current: 1, best: 2 });
    expect(run([70, 70, 70, 10])).toEqual({ current: 0, best: 3 });
  });
  it('earns On a roll at 3 in a row', () => {
    expect(badge(many(3, { minutes: 60 }), 'on-a-roll').earned).toBe(true);
    expect(
      badge(
        [
          ...many(2, { minutes: 60 }),
          visit({ minutes: 5 }),
          visit({ minutes: 60 }),
        ],
        'on-a-roll',
      ),
    ).toMatchObject({ earned: false, progressText: '2 / 3 visits in a row' });
  });
});
