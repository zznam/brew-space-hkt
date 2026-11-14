import type { BillingMode, Seat, Session, Venue } from '../../../core/domain';
import { visitHabits } from '../loyalty/loyaltyModel';
import type { VisitSnapshot } from '../shared/visit';
import { hasAmenities, type Amenity } from '../venue/seatAmenities';

/** Pure seat discovery rules. Occupancy is reported as counts only. */
export const USUAL_MIN_VISITS = 3;
export interface SeatFilters {
  /** Empty means every kind. */
  kinds: Seat['kind'][];
  /** Inclusive hourly VND ceiling; null means any price. */
  maxRate: number | null;
  availableOnly: boolean;
  /** Amenities a seat must all have (AND). Missing or empty means no
   * amenity filter. Amenities are demo presentation data, see seatAmenities. */
  amenities?: Amenity[];
}
export const noFilters = (): SeatFilters => ({
  kinds: [],
  maxRate: null,
  availableOnly: false,
  amenities: [],
});
export const hasActiveFilters = (filters: SeatFilters) =>
  filters.kinds.length > 0 ||
  filters.maxRate !== null ||
  filters.availableOnly ||
  (filters.amenities?.length ?? 0) > 0;

const occupiedSeatIds = (venue: Venue, sessions: Session[]) =>
  new Set(
    sessions
      .filter((session) => session.venueId === venue.id)
      .map((session) => session.seatId),
  );

export function filterSeats(
  venue: Venue,
  sessions: Session[],
  filters: SeatFilters,
): Seat[] {
  const occupied = occupiedSeatIds(venue, sessions);
  return venue.seats.filter(
    (seat) =>
      (filters.kinds.length === 0 || filters.kinds.includes(seat.kind)) &&
      (filters.maxRate === null || seat.hourlyRate <= filters.maxRate) &&
      (!filters.availableOnly || !occupied.has(seat.id)) &&
      hasAmenities(seat, filters.amenities ?? []),
  );
}
export const freeSeats = (venue: Venue, sessions: Session[]) =>
  filterSeats(venue, sessions, { ...noFilters(), availableOnly: true });

export interface OccupancySummary {
  free: number;
  total: number;
  /** Free seats per kind. */
  byKind: Record<Seat['kind'], number>;
}
export function occupancySummary(
  venue: Venue,
  sessions: Session[],
): OccupancySummary {
  const free = freeSeats(venue, sessions);
  const byKind = { desk: 0, pod: 0, booth: 0 };
  for (const seat of free) byKind[seat.kind]++;
  return { free: free.length, total: venue.seats.length, byKind };
}
const KIND_ORDER: Seat['kind'][] = ['desk', 'pod', 'booth'];
/** "5 of 8 seats free · 3 desks, 1 pod, 1 booth" */
export function describeOccupancy(summary: OccupancySummary) {
  const parts = KIND_ORDER.filter((kind) => summary.byKind[kind] > 0).map(
    (kind) =>
      `${summary.byKind[kind]} ${kind}${summary.byKind[kind] === 1 ? '' : 's'}`,
  );
  return `${summary.free} of ${summary.total} seats free${parts.length ? ` · ${parts.join(', ')}` : ''}`;
}

export const MODE_LABEL: Record<BillingMode, string> = {
  METERED_OPEN: 'metered time',
  BUNDLE_2H: 'the 2h bundle',
  BUNDLE_4H: 'the 4h bundle',
};
export interface UsualSuggestion {
  visitCount: number;
  seatKind: Seat['kind'];
  mode: BillingMode;
  topItem: string | null;
  /** Free seat to select, or null when none fits (see reason). */
  seat: Seat | null;
  viaFavourite: boolean;
  reason: string | null;
}
/** Null until the customer has at least three visits in this venue. */
export function usualSuggestion(
  visits: VisitSnapshot[],
  venue: Venue,
  sessions: Session[],
  favouriteSeatIds: string[] = [],
): UsualSuggestion | null {
  const here = visits.filter((visit) => visit.venueId === venue.id);
  if (here.length < USUAL_MIN_VISITS) return null;
  const habits = visitHabits(here);
  if (!habits.seatKind || !habits.mode) return null;
  const free = freeSeats(venue, sessions);
  const favourite = favouriteSeatIds
    .map((id) => free.find((seat) => seat.id === id))
    .find((seat) => seat !== undefined);
  const sameKind = free.find((seat) => seat.kind === habits.seatKind);
  const seat = favourite ?? sameKind ?? null;
  return {
    visitCount: here.length,
    seatKind: habits.seatKind,
    mode: habits.mode,
    topItem: habits.item,
    seat,
    viaFavourite: favourite !== undefined,
    reason: seat
      ? null
      : `No ${habits.seatKind} is free right now. Check back soon or pick another seat.`,
  };
}
