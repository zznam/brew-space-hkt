import { getAllVenues } from '../../../core/fixtures';
import type { BillingMode, Seat } from '../../../core/domain';
import type { VisitSnapshot } from '../shared/visit';

/**
 * Pure loyalty rules for the customer demo. Membership is scoped per tenant;
 * in this demo each venue is one tenant, so everything is keyed by venueId.
 * Points are never redeemable in this slice (follow-up: reserve/redeem/refund).
 */
export const DEMO_OTP = '123456';
export const MAX_FAVOURITES = 3;
export const MAX_ALLERGY_NOTE = 120;
export const POINT_UNIT_VND = 1000;
export const MILK_OPTIONS = ['dairy', 'oat', 'almond', 'none'] as const;
export const SWEETNESS_OPTIONS = [0, 30, 50, 70, 100] as const;
export type Milk = (typeof MILK_OPTIONS)[number];
export type Sweetness = (typeof SWEETNESS_OPTIONS)[number];

export interface Membership {
  venueId: string;
  /** Normalised 10 digit number. Display it through maskPhone only. */
  phone: string;
  consent: true;
}
export interface LedgerEntry {
  id: string;
  venueId: string;
  sessionId: string;
  points: number;
  kind: 'earn';
}
export interface Preferences {
  milk: Milk;
  sweetness: Sweetness;
  allergyNote: string;
}
export interface LoyaltyState {
  memberships: Record<string, Membership>;
  ledger: LedgerEntry[];
  visits: VisitSnapshot[];
  preferences: Record<string, Preferences>;
  favourites: Record<string, string[]>;
}
export type ModelResult =
  { ok: true; state: LoyaltyState } | { ok: false; message: string };
export interface VenueStats {
  visits: number;
  totalMinutes: number;
  totalSpend: number;
  favouriteSeatKind: Seat['kind'] | null;
  favouriteItem: string | null;
}
export interface VisitHabits {
  seatKind: Seat['kind'] | null;
  mode: BillingMode | null;
  item: string | null;
}

export const defaultPreferences = (): Preferences => ({
  milk: 'none',
  sweetness: 50,
  allergyNote: '',
});
export const initialLoyaltyState = (): LoyaltyState => ({
  memberships: {},
  ledger: [],
  visits: [],
  preferences: {},
  favourites: {},
});

export const isKnownVenue = (venueId: string) =>
  getAllVenues().some((venue) => venue.id === venueId);
export const isKnownSeat = (venueId: string, seatId: string) =>
  getAllVenues().some(
    (venue) =>
      venue.id === venueId && venue.seats.some((seat) => seat.id === seatId),
  );

/* ---------- Phone and OTP (demo only: no SMS is sent) ---------- */

export const normalisePhone = (phone: string) => phone.replace(/[\s.-]/g, '');
export const isValidPhone = (phone: string) =>
  /^0\d{9}$/.test(normalisePhone(phone));
/** 0901234567 -> 090****567 */
export function maskPhone(phone: string) {
  const digits = normalisePhone(phone);
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}
export function requestOtp(
  phone: string,
):
  | { ok: true; phone: string; demoCode: string }
  | { ok: false; message: string } {
  if (!isValidPhone(phone))
    return {
      ok: false,
      message: 'Enter a 10 digit mobile number starting with 0.',
    };
  return { ok: true, phone: normalisePhone(phone), demoCode: DEMO_OTP };
}
export const verifyOtp = (code: string) => code.trim() === DEMO_OTP;

/* ---------- Membership ---------- */

export const isMember = (state: LoyaltyState, venueId: string) =>
  venueId in state.memberships;

export function joinProgramme(
  state: LoyaltyState,
  venueId: string,
  input: { phone: string; code: string; consent: boolean },
): ModelResult {
  if (!isKnownVenue(venueId)) return { ok: false, message: 'Unknown venue.' };
  if (isMember(state, venueId))
    return { ok: false, message: 'You already joined this programme.' };
  const otp = requestOtp(input.phone);
  if (!otp.ok) return otp;
  if (!verifyOtp(input.code))
    return { ok: false, message: 'The code is not correct. Try again.' };
  if (input.consent !== true)
    return {
      ok: false,
      message: 'Please agree to the data use above to join.',
    };
  return {
    ok: true,
    state: {
      ...state,
      memberships: {
        ...state.memberships,
        [venueId]: { venueId, phone: otp.phone, consent: true },
      },
      preferences: {
        ...state.preferences,
        [venueId]: defaultPreferences(),
      },
    },
  };
}

/** Removes membership, points, visits, preferences and favourites of one venue. */
export function leaveProgramme(
  state: LoyaltyState,
  venueId: string,
): LoyaltyState {
  const without = <T>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== venueId),
    ) as Record<string, T>;
  return {
    memberships: without(state.memberships),
    ledger: state.ledger.filter((entry) => entry.venueId !== venueId),
    visits: state.visits.filter((visit) => visit.venueId !== venueId),
    preferences: without(state.preferences),
    favourites: without(state.favourites),
  };
}

/* ---------- Points and visits ---------- */

/** One point per full 1,000 VND; invalid totals earn nothing. */
export const pointsForTotal = (total: number) =>
  Number.isSafeInteger(total) && total > 0
    ? Math.floor(total / POINT_UNIT_VND)
    : 0;

/** Idempotent by sessionId. Every visit counts for stats; only members earn. */
export function recordVisit(
  state: LoyaltyState,
  snapshot: VisitSnapshot,
): LoyaltyState {
  if (state.visits.some((visit) => visit.sessionId === snapshot.sessionId))
    return state;
  const points = isMember(state, snapshot.venueId)
    ? pointsForTotal(snapshot.total)
    : 0;
  return {
    ...state,
    visits: [...state.visits, snapshot],
    ledger:
      points > 0
        ? [
            ...state.ledger,
            {
              id: `earn-${snapshot.sessionId}`,
              venueId: snapshot.venueId,
              sessionId: snapshot.sessionId,
              points,
              kind: 'earn',
            },
          ]
        : state.ledger,
  };
}

export const pointsBalance = (state: LoyaltyState, venueId: string) =>
  state.ledger
    .filter((entry) => entry.venueId === venueId)
    .reduce((sum, entry) => sum + entry.points, 0);

/* ---------- Habits and stats ---------- */

/** Most frequent value; ties go to the one seen most recently (input is oldest first). */
function mostFrequent<T extends string>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const value of [...values].reverse()) {
    const count = counts.get(value) ?? 0;
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
function topItem(visits: VisitSnapshot[]): string | null {
  const totals = new Map<string, number>();
  const order: string[] = [];
  for (const visit of visits)
    for (const item of visit.orders) {
      if (!totals.has(item.name)) order.push(item.name);
      totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity);
    }
  let best: string | null = null;
  let bestCount = 0;
  for (const name of order) {
    const count = totals.get(name) ?? 0;
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}
export function visitHabits(visits: VisitSnapshot[]): VisitHabits {
  return {
    seatKind: mostFrequent(visits.map((visit) => visit.seatKind)),
    mode: mostFrequent(visits.map((visit) => visit.mode)),
    item: topItem(visits),
  };
}
export function venueStats(state: LoyaltyState, venueId: string): VenueStats {
  const visits = state.visits.filter((visit) => visit.venueId === venueId);
  const habits = visitHabits(visits);
  return {
    visits: visits.length,
    totalMinutes: visits.reduce((sum, visit) => sum + visit.minutes, 0),
    totalSpend: visits.reduce((sum, visit) => sum + visit.total, 0),
    favouriteSeatKind: habits.seatKind,
    favouriteItem: habits.item,
  };
}

/* ---------- Preferences (members only) ---------- */

export const getPreferences = (state: LoyaltyState, venueId: string) =>
  state.preferences[venueId] ?? defaultPreferences();

export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false;
  const prefs = value as Preferences;
  return (
    MILK_OPTIONS.includes(prefs.milk) &&
    SWEETNESS_OPTIONS.includes(prefs.sweetness) &&
    typeof prefs.allergyNote === 'string' &&
    prefs.allergyNote.length <= MAX_ALLERGY_NOTE
  );
}
export function setPreferences(
  state: LoyaltyState,
  venueId: string,
  prefs: Preferences,
): ModelResult {
  if (!isMember(state, venueId))
    return { ok: false, message: 'Join the programme to save preferences.' };
  const next = { ...prefs, allergyNote: prefs.allergyNote.trim() };
  if (!isPreferences(next))
    return {
      ok: false,
      message: `Allergy note can be up to ${MAX_ALLERGY_NOTE} characters.`,
    };
  return {
    ok: true,
    state: {
      ...state,
      preferences: { ...state.preferences, [venueId]: next },
    },
  };
}
export const ALLERGY_NOTICE = 'Staff will always be notified about allergies';
export const allergyNotice = (prefs: Preferences) =>
  prefs.allergyNote.trim() ? ALLERGY_NOTICE : null;

/* ---------- Favourite seats (per venue, at most three) ---------- */

export const favouriteSeatIds = (state: LoyaltyState, venueId: string) =>
  state.favourites[venueId] ?? [];

export function toggleFavourite(
  state: LoyaltyState,
  venueId: string,
  seatId: string,
): ModelResult {
  if (!isKnownSeat(venueId, seatId))
    return { ok: false, message: 'That seat is not in this venue.' };
  const current = favouriteSeatIds(state, venueId);
  let next: string[];
  if (current.includes(seatId)) next = current.filter((id) => id !== seatId);
  else if (current.length >= MAX_FAVOURITES)
    return {
      ok: false,
      message: `You can pin up to ${MAX_FAVOURITES} seats. Unpin one first.`,
    };
  else next = [...current, seatId];
  return {
    ok: true,
    state: { ...state, favourites: { ...state.favourites, [venueId]: next } },
  };
}
