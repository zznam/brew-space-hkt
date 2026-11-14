import type { Seat, Venue } from '../../../core/domain';

/**
 * Seat amenities are PRESENTATION DATA owned by the customer app for now.
 * The core `Seat` has no attribute fields, and the backend does not own seat
 * attributes yet. Until it does, amenities are derived deterministically from
 * the seat's kind and grid position, so the same seat always shows the same
 * amenities and every demo venue (all three share the fixture layout) has seats
 * with and without each amenity. Replace `seatAmenities` with backend data
 * (keyed by seat id) when it exists; callers only depend on the function.
 */
export type Amenity = 'power' | 'window' | 'quiet' | 'monitor';

export const AMENITIES: { key: Amenity; label: string }[] = [
  { key: 'power', label: 'Power outlet' },
  { key: 'window', label: 'Window' },
  { key: 'quiet', label: 'Quiet zone' },
  { key: 'monitor', label: 'Monitor available' },
];
export const AMENITY_LABEL: Record<Amenity, string> = {
  power: 'Power outlet',
  window: 'Window',
  quiet: 'Quiet zone',
  monitor: 'Monitor available',
};

/** Derivation rules (grid is x 0-3, z 0-1 in the demo venues):
 * - power: every pod and booth, plus desks on even columns.
 * - window: seats in the outer columns, except the enclosed booth.
 * - quiet: pods, booths and the back-row desks (z = 1).
 * - monitor: pods and booths. */
export function seatAmenities(seat: Pick<Seat, 'kind' | 'x' | 'z'>): Amenity[] {
  const enclosed = seat.kind !== 'desk';
  const list: Amenity[] = [];
  if (enclosed || seat.x % 2 === 0) list.push('power');
  if (seat.kind !== 'booth' && (seat.x === 0 || seat.x === 3))
    list.push('window');
  if (enclosed || seat.z === 1) list.push('quiet');
  if (enclosed) list.push('monitor');
  return list;
}

/** Amenities of every seat of a venue, keyed by seat id. */
export function venueAmenities(venue: Venue): Record<string, Amenity[]> {
  return Object.fromEntries(
    venue.seats.map((seat) => [seat.id, seatAmenities(seat)]),
  );
}

/** True when the seat has every wanted amenity (AND). Empty list matches all. */
export const hasAmenities = (
  seat: Pick<Seat, 'kind' | 'x' | 'z'>,
  wanted: readonly Amenity[],
) => {
  const have = seatAmenities(seat);
  return wanted.every((amenity) => have.includes(amenity));
};

export const describeAmenities = (amenities: readonly Amenity[]) =>
  amenities.length
    ? amenities.map((amenity) => AMENITY_LABEL[amenity]).join(', ')
    : 'No listed amenities';
