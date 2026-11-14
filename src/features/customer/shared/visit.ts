import {
  calculateBill,
  getVenue,
  type BillingMode,
  type Seat,
  type Session,
} from '@/core';

/** Immutable record of a finished customer session, captured before the core
 * store releases the seat. Shared by the receipt, rating and loyalty features. */
export interface VisitSnapshot {
  sessionId: string;
  venueId: string;
  venueName: string;
  seatId: string;
  seatLabel: string;
  seatKind: Seat['kind'];
  mode: BillingMode;
  minutes: number;
  time: number;
  items: number;
  total: number;
  orders: { name: string; unitPrice: number; quantity: number }[];
}

export function buildVisitSnapshot(session: Session): VisitSnapshot {
  const venue = getVenue(session.venueId);
  const seat = venue.seats.find((entry) => entry.id === session.seatId);
  if (!seat) throw new Error(`Unknown seat: ${session.seatId}`);
  const bill = calculateBill(session);
  return {
    sessionId: session.id,
    venueId: venue.id,
    venueName: venue.name,
    seatId: seat.id,
    seatLabel: seat.label,
    seatKind: seat.kind,
    mode: session.mode,
    minutes: session.elapsedMinutes,
    time: bill.time,
    items: bill.items,
    total: bill.total,
    orders: session.orders.map(({ name, unitPrice, quantity }) => ({
      name,
      unitPrice,
      quantity,
    })),
  };
}
