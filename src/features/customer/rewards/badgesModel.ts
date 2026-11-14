import type { Seat } from '../../../core/domain';
import type { VisitSnapshot } from '../shared/visit';

/**
 * Pure badge and streak rules. Badges are cosmetic: no cash value, no points.
 * They are derived on the fly from the visit history already stored on this
 * device, so nothing extra is persisted. Visits carry no timestamps, so there
 * are deliberately no time-of-day badges and a streak counts consecutive
 * recorded visits in the order they finished, never calendar days.
 */
export const REGULAR_VISITS = 5;
export const DEEP_WORK_MINUTES = 240;
export const MARATHON_MINUTES = 20 * 60;
export const SNACK_ITEMS = 5;
export const STREAK_MIN_MINUTES = 60;
export const STREAK_BADGE_LENGTH = 3;
export const SEAT_KINDS: Seat['kind'][] = ['desk', 'booth', 'pod'];

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  current: number;
  target: number;
  /** e.g. "3 / 5 visits"; capped at the target once earned. */
  progressText: string;
}
export interface Streak {
  /** Run of qualifying visits ending at the most recent visit. */
  current: number;
  best: number;
}

const hours = (minutes: number) =>
  `${Math.round((minutes / 60) * 10) / 10}`.replace(/\.0$/, '');

/** Oldest first, as stored. Pass the visits of one venue only. */
export function computeStreak(visits: VisitSnapshot[]): Streak {
  let current = 0;
  let best = 0;
  for (const visit of visits) {
    current = visit.minutes >= STREAK_MIN_MINUTES ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}

function badge(
  id: string,
  name: string,
  description: string,
  rawCurrent: number,
  target: number,
  progress: (current: number) => string,
): Badge {
  const current = Math.min(rawCurrent, target);
  return {
    id,
    name,
    description,
    earned: rawCurrent >= target,
    current,
    target,
    progressText: progress(current),
  };
}

/** `visits` must already be filtered to one venue (oldest first). */
export function computeBadges(visits: VisitSnapshot[]): Badge[] {
  const totalMinutes = visits.reduce((sum, v) => sum + v.minutes, 0);
  const longest = visits.reduce((max, v) => Math.max(max, v.minutes), 0);
  const kinds = new Set(visits.map((v) => v.seatKind)).size;
  const items = visits.reduce(
    (sum, v) => sum + v.orders.reduce((n, o) => n + o.quantity, 0),
    0,
  );
  const { best } = computeStreak(visits);
  return [
    badge(
      'first-visit',
      'First visit',
      'Complete your first visit.',
      visits.length,
      1,
      (c) => `${c} / 1 visit`,
    ),
    badge(
      'regular',
      'Regular',
      `Complete ${REGULAR_VISITS} visits.`,
      visits.length,
      REGULAR_VISITS,
      (c) => `${c} / ${REGULAR_VISITS} visits`,
    ),
    badge(
      'deep-worker',
      'Deep worker',
      `Stay ${DEEP_WORK_MINUTES / 60} hours or more in a single visit.`,
      longest,
      DEEP_WORK_MINUTES,
      (c) => `${c} / ${DEEP_WORK_MINUTES} min in your longest visit`,
    ),
    badge(
      'marathon',
      'Marathon',
      `Spend ${MARATHON_MINUTES / 60} hours here in total.`,
      totalMinutes,
      MARATHON_MINUTES,
      (c) => `${hours(c)} / ${MARATHON_MINUTES / 60} h in total`,
    ),
    badge(
      'explorer',
      'Explorer',
      'Sit at a desk, a booth and a pod.',
      kinds,
      SEAT_KINDS.length,
      (c) => `${c} / ${SEAT_KINDS.length} seat types`,
    ),
    badge(
      'snack-lover',
      'Snack lover',
      `Order ${SNACK_ITEMS} food or drink items in total.`,
      items,
      SNACK_ITEMS,
      (c) => `${c} / ${SNACK_ITEMS} items`,
    ),
    badge(
      'on-a-roll',
      'On a roll',
      `${STREAK_BADGE_LENGTH} visits in a row of ${STREAK_MIN_MINUTES} minutes or more.`,
      best,
      STREAK_BADGE_LENGTH,
      (c) => `${c} / ${STREAK_BADGE_LENGTH} visits in a row`,
    ),
  ];
}
