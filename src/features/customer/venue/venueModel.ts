import { calculateBill } from '../../../core/billing';
import type { BillingMode, Seat, Session, Venue } from '../../../core/domain';
import type { Lang } from '../../../i18n/i18n';
import { venueT } from './messages';
import { getVenueInfo, type DayHours } from '../support/venueInfo';

/** Pure venue page rules: price table, seat estimates, opening hours. All
 * prices come from core `calculateBill` on a synthetic session; nothing here
 * duplicates pricing math. Estimates are demo figures, not quotes. */
export interface SeatEstimates {
  /** One hour of metered time. */
  metered1h: number;
  /** Full 2h bundle, 15% off seat time. */
  bundle2h: number;
  /** Full 4h bundle, 15% off seat time. */
  bundle4h: number;
}

const ESTIMATE_MINUTES: Record<BillingMode, number> = {
  METERED_OPEN: 60,
  BUNDLE_2H: 120,
  BUNDLE_4H: 240,
};
function quote(venueId: string, hourlyRate: number, mode: BillingMode) {
  const session: Session = {
    id: 'estimate',
    venueId,
    seatId: 'estimate',
    customerId: 'estimate',
    mode,
    elapsedMinutes: ESTIMATE_MINUTES[mode],
    lockedHourlyRate: hourlyRate,
    orders: [],
  };
  return calculateBill(session).total;
}
export function estimateForRate(
  venueId: string,
  hourlyRate: number,
): SeatEstimates {
  return {
    metered1h: quote(venueId, hourlyRate, 'METERED_OPEN'),
    bundle2h: quote(venueId, hourlyRate, 'BUNDLE_2H'),
    bundle4h: quote(venueId, hourlyRate, 'BUNDLE_4H'),
  };
}
export const estimateSeat = (seat: Seat): SeatEstimates =>
  estimateForRate(seat.venueId, seat.hourlyRate);

export interface PriceRow extends SeatEstimates {
  kind: Seat['kind'];
  seatCount: number;
  /** Lowest hourly rate of this kind; estimates use it. */
  hourlyRate: number;
  /** True when seats of this kind have different rates (show "from"). */
  varies: boolean;
}
const KIND_ORDER: Seat['kind'][] = ['desk', 'pod', 'booth'];
/** One row per seat kind present in the venue, in desk, pod, booth order. */
export function priceTable(venue: Venue): PriceRow[] {
  return KIND_ORDER.flatMap((kind) => {
    const seats = venue.seats.filter((seat) => seat.kind === kind);
    if (seats.length === 0) return [];
    const rates = seats.map((seat) => seat.hourlyRate);
    const hourlyRate = Math.min(...rates);
    return [
      {
        kind,
        seatCount: seats.length,
        hourlyRate,
        varies: Math.max(...rates) !== hourlyRate,
        ...estimateForRate(venue.id, hourlyRate),
      },
    ];
  });
}

/** Status text for a seat. Never says who occupies it. */
export const seatStatusText = (occupied: boolean, lang: Lang = 'en') =>
  venueT(lang)(occupied ? 'statusOccupied' : 'statusAvailable');

// Opening hours -----------------------------------------------------------
const DAY_KEYS = [
  'daySun',
  'dayMon',
  'dayTue',
  'dayWed',
  'dayThu',
  'dayFri',
  'daySat',
] as const;
/** Display order: Monday first. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const dayText = (day: DayHours | null, lang: Lang) =>
  !day
    ? venueT(lang)('hoursClosed')
    : day.open === '00:00' && day.close === '24:00'
      ? venueT(lang)('hours24')
      : `${day.open} - ${day.close}`;
const unpublished = (hours: (DayHours | null)[]) =>
  hours.length !== 7 || hours.every((day) => day === null);
export interface HoursLine {
  days: string;
  text: string;
}
/** Groups consecutive weekdays with the same hours: "Mon - Fri: 07:30 - 21:00". */
export function describeHours(
  hours: (DayHours | null)[],
  lang: Lang = 'en',
): HoursLine[] {
  const t = venueT(lang);
  if (unpublished(hours))
    return [{ days: t('hoursTitle'), text: t('hoursUnpublished') }];
  const lines: { from: number; to: number; text: string }[] = [];
  DISPLAY_ORDER.forEach((dayIndex, position) => {
    const text = dayText(hours[dayIndex] ?? null, lang);
    const last = lines[lines.length - 1];
    if (last && last.text === text) last.to = position;
    else lines.push({ from: position, to: position, text });
  });
  const name = (position: number) =>
    t(DAY_KEYS[DISPLAY_ORDER[position] ?? 0] ?? 'dayMon');
  if (lines.length === 1 && lines[0])
    return [{ days: t('everyDay'), text: lines[0].text }];
  return lines.map((line) => ({
    days:
      line.from === line.to
        ? name(line.from)
        : `${name(line.from)} - ${name(line.to)}`,
    text: line.text,
  }));
}

/** Weekday (0 = Sunday) and minutes since midnight at the venue, derived from
 * the instant `now` and a fixed UTC offset. */
export function venueClock(now: Date, utcOffsetMinutes: number) {
  const shifted = new Date(now.getTime() + utcOffsetMinutes * 60000);
  return {
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}
/** Open/closed at `now` (device clock) in venue time, or null when the venue
 * has no published hours or the clock is invalid, so we cannot say honestly. */
export function isOpenAt(
  hours: (DayHours | null)[],
  utcOffsetMinutes: number,
  now: Date,
): boolean | null {
  if (unpublished(hours) || Number.isNaN(now.getTime())) return null;
  const { weekday, minutes } = venueClock(now, utcOffsetMinutes);
  const today = hours[weekday];
  if (!today) return false;
  return minutes >= toMinutes(today.open) && minutes < toMinutes(today.close);
}
export function venuePageInfo(
  venue: Venue,
  now: Date | null,
  lang: Lang = 'en',
) {
  const info = getVenueInfo(venue.id, lang);
  return {
    address: info.address,
    hours: describeHours(info.hours, lang),
    openNow: now ? isOpenAt(info.hours, info.utcOffsetMinutes, now) : null,
    prices: priceTable(venue),
  };
}
