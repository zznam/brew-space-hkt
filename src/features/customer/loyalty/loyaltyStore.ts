import { createStore } from 'zustand/vanilla';
import type { ActionResult } from '../../../core/domain';
import type { VisitSnapshot } from '../shared/visit';
import {
  LEDGER_KINDS,
  MAX_FAVOURITES,
  initialLoyaltyState,
  isKnownSeat,
  isKnownVenue,
  isPreferences,
  isValidPhone,
  joinProgramme,
  leaveProgramme,
  recordVisit,
  setPreferences,
  toggleFavourite,
  type JoinInput,
  type LoyaltyState,
  type ModelResult,
  type Preferences,
} from './loyaltyModel';

export interface LoyaltyStore extends LoyaltyState {
  join: (venueId: string, input: JoinInput) => ActionResult;
  leave: (venueId: string) => void;
  recordVisit: (snapshot: VisitSnapshot) => void;
  toggleFavourite: (venueId: string, seatId: string) => ActionResult;
  setPreferences: (venueId: string, prefs: Preferences) => ActionResult;
  reset: () => void;
}

/** Fresh vanilla store per call; persistence lives in useLoyalty.ts. */
export function createLoyaltyStore() {
  return createStore<LoyaltyStore>()((set, get) => {
    const apply = (result: ModelResult): ActionResult => {
      if (!result.ok) return result;
      set(result.state);
      return { ok: true };
    };
    return {
      ...initialLoyaltyState(),
      join: (venueId, input) => apply(joinProgramme(get(), venueId, input)),
      leave: (venueId) => set(leaveProgramme(get(), venueId)),
      recordVisit: (snapshot) => {
        const next = recordVisit(get(), snapshot);
        if (next !== get()) set(next);
      },
      toggleFavourite: (venueId, seatId) =>
        apply(toggleFavourite(get(), venueId, seatId)),
      setPreferences: (venueId, prefs) =>
        apply(setPreferences(get(), venueId, prefs)),
      reset: () => set(initialLoyaltyState()),
    };
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
const MODES = ['METERED_OPEN', 'BUNDLE_2H', 'BUNDLE_4H'];
const KINDS = ['desk', 'booth', 'pod'];

function isVisit(value: unknown): value is VisitSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.sessionId === 'string' &&
    value.sessionId.length > 0 &&
    typeof value.venueId === 'string' &&
    isKnownVenue(value.venueId) &&
    typeof value.venueName === 'string' &&
    typeof value.seatId === 'string' &&
    isKnownSeat(value.venueId, value.seatId) &&
    typeof value.seatLabel === 'string' &&
    KINDS.includes(value.seatKind as string) &&
    MODES.includes(value.mode as string) &&
    isCount(value.minutes) &&
    isCount(value.time) &&
    isCount(value.items) &&
    isCount(value.total) &&
    Array.isArray(value.orders) &&
    value.orders.every(
      (order: unknown) =>
        isRecord(order) &&
        typeof order.name === 'string' &&
        isCount(order.unitPrice) &&
        isCount(order.quantity) &&
        (order.quantity as number) > 0,
    )
  );
}

/** Validate persisted snapshots before merging them into the live store. */
export function isLoyaltyState(value: unknown): value is LoyaltyState {
  if (!isRecord(value)) return false;
  const { memberships, ledger, visits, preferences, favourites } = value;
  if (
    !isRecord(memberships) ||
    !Array.isArray(ledger) ||
    !Array.isArray(visits) ||
    !isRecord(preferences) ||
    !isRecord(favourites)
  )
    return false;
  const membershipsOk = Object.entries(memberships).every(
    ([venueId, member]) =>
      isKnownVenue(venueId) &&
      isRecord(member) &&
      member.venueId === venueId &&
      typeof member.phone === 'string' &&
      isValidPhone(member.phone) &&
      member.consent === true &&
      (member.referredBy === undefined ||
        typeof member.referredBy === 'string'),
  );
  const visitsOk =
    visits.every(isVisit) &&
    new Set(visits.map((visit) => (visit as VisitSnapshot).sessionId)).size ===
      visits.length;
  const ledgerOk =
    new Set(ledger.map((entry) => (entry as { id?: unknown })?.id)).size ===
      ledger.length &&
    ledger.every(
      (entry: unknown) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.venueId === 'string' &&
        isKnownVenue(entry.venueId) &&
        typeof entry.sessionId === 'string' &&
        isCount(entry.points) &&
        LEDGER_KINDS.includes(entry.kind as 'earn'),
    );
  const preferencesOk = Object.entries(preferences).every(
    ([venueId, prefs]) => isKnownVenue(venueId) && isPreferences(prefs),
  );
  const favouritesOk = Object.entries(favourites).every(
    ([venueId, seatIds]) =>
      isKnownVenue(venueId) &&
      Array.isArray(seatIds) &&
      seatIds.length <= MAX_FAVOURITES &&
      new Set(seatIds).size === seatIds.length &&
      seatIds.every(
        (seatId) => typeof seatId === 'string' && isKnownSeat(venueId, seatId),
      ),
  );
  return membershipsOk && visitsOk && ledgerOk && preferencesOk && favouritesOk;
}
