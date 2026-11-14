import { describe, expect, it } from 'vitest';
import { computeBadges } from '../src/features/customer/rewards/badgesModel';
import { badgesMessages } from '../src/features/customer/rewards/messages';
import type { VisitSnapshot } from '../src/features/customer/shared/visit';

const visit = (n: number, minutes = 300): VisitSnapshot => ({
  sessionId: `s${n}`,
  venueId: 'grind',
  venueName: 'The Grind Co-Work',
  seatId: 'grind-seat-1',
  seatLabel: 'Seat 1',
  seatKind: 'desk',
  mode: 'METERED_OPEN',
  minutes,
  time: 15000,
  items: 0,
  total: 15000,
  orders: [],
});

describe('badges i18n', () => {
  it('has a non-empty Vietnamese value for every key', () => {
    for (const [key, value] of Object.entries(badgesMessages.vi))
      expect(value.trim(), key).not.toBe('');
  });
  it('keeps English names, descriptions and progress by default', () => {
    const badges = computeBadges([visit(1)]);
    expect(badges.map((badge) => badge.name)).toEqual([
      'First visit',
      'Regular',
      'Deep worker',
      'Marathon',
      'Explorer',
      'Snack lover',
      'On a roll',
    ]);
    expect(badges[0]?.progressText).toBe('1 / 1 visit');
    expect(badges[1]?.description).toBe('Complete 5 visits.');
    expect(badges[2]?.progressText).toBe('240 / 240 min in your longest visit');
    expect(badges[3]?.progressText).toBe('5 / 20 h in total');
  });
  it('returns Vietnamese names, descriptions and progress for vi', () => {
    const en = computeBadges([visit(1)]);
    const vi = computeBadges([visit(1)], 'vi');
    expect(vi.map((badge) => badge.id)).toEqual(en.map((badge) => badge.id));
    expect(vi[0]?.name).toBe('Lần ghé đầu tiên');
    expect(vi[0]?.progressText).toBe('1 / 1 lần ghé');
    expect(vi[1]?.description).toBe('Hoàn thành 5 lần ghé.');
    expect(vi[3]?.progressText).toBe('5 / 20 giờ tổng cộng');
    for (const badge of vi) {
      expect(badge.name).not.toMatch(/[{}]/);
      expect(badge.description).not.toMatch(/[{}]/);
      expect(badge.progressText).not.toMatch(/[{}]/);
    }
    // Earned state and numbers do not depend on language.
    expect(vi.map((badge) => badge.earned)).toEqual(
      en.map((badge) => badge.earned),
    );
  });
});
