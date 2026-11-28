import type { Seat, Session } from '@/core/domain';

export type ZoneSummary = { zone: string | null; free: number; total: number };

/**
 * F260: free seats per zone, as a text alternative to the 3D floor. Zones keep the order
 * in which they first appear in the venue; seats without a zone are grouped last (zone null).
 */
export function floorSummary(
  venueId: string,
  seats: readonly Pick<Seat, 'id' | 'zone'>[],
  sessions: readonly Pick<Session, 'venueId' | 'seatId'>[],
): ZoneSummary[] {
  const busy = new Set(
    sessions.filter((s) => s.venueId === venueId).map((s) => s.seatId),
  );
  const zones = new Map<string | null, ZoneSummary>();
  for (const seat of seats) {
    const zone = seat.zone?.trim() || null;
    const entry = zones.get(zone) ?? { zone, free: 0, total: 0 };
    entry.total += 1;
    if (!busy.has(seat.id)) entry.free += 1;
    zones.set(zone, entry);
  }
  const named = [...zones.values()].filter((z) => z.zone !== null);
  const unzoned = zones.get(null);
  return unzoned ? [...named, unzoned] : named;
}
