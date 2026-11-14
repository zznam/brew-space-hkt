import type { MenuItem, Session } from '../../../core';

/** Pure cart/order helpers. No React, no storage; safe to import from tests. */
export const MAX_LINE_QUANTITY = 20;
export const MAX_NOTE_LENGTH = 120;
/** Demo time only moves in 30 minute steps (simulator "+30m"). */
export const SERVED_AFTER_MINUTES = 30;

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
}
export interface PlacedOrder {
  id: string;
  venueId: string;
  sessionId: string;
  lines: CartLine[];
  total: number;
  /** session.elapsedMinutes at the moment the order was placed. */
  placedAtMinute: number;
}
export type OrderStatus = 'queued' | 'preparing' | 'served';

export function addToCart(lines: CartLine[], item: MenuItem): CartLine[] {
  if (!Number.isSafeInteger(item.price) || item.price < 0)
    throw new Error(`Invalid price for ${item.id}`);
  if (lines.some((line) => line.menuItemId === item.id))
    return lines.map((line) =>
      line.menuItemId === item.id
        ? {
            ...line,
            quantity: Math.min(MAX_LINE_QUANTITY, line.quantity + 1),
          }
        : line,
    );
  return [
    ...lines,
    {
      menuItemId: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
      note: '',
    },
  ];
}

/** Quantity <= 0 removes the line; values above the cap are clamped. */
export function setQuantity(
  lines: CartLine[],
  menuItemId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isFinite(quantity)) return lines;
  const next = Math.min(MAX_LINE_QUANTITY, Math.trunc(quantity));
  if (next <= 0) return removeLine(lines, menuItemId);
  return lines.map((line) =>
    line.menuItemId === menuItemId ? { ...line, quantity: next } : line,
  );
}

export function setNote(
  lines: CartLine[],
  menuItemId: string,
  note: string,
): CartLine[] {
  const clean = note.trim().slice(0, MAX_NOTE_LENGTH).trim();
  return lines.map((line) =>
    line.menuItemId === menuItemId ? { ...line, note: clean } : line,
  );
}

export function removeLine(lines: CartLine[], menuItemId: string): CartLine[] {
  return lines.filter((line) => line.menuItemId !== menuItemId);
}

/** Integer VND estimate; throws on invalid inputs like calculateBill. */
export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => {
    if (
      !Number.isSafeInteger(line.unitPrice) ||
      line.unitPrice < 0 ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1
    )
      throw new Error('Invalid cart line');
    const next = sum + line.unitPrice * line.quantity;
    if (!Number.isSafeInteger(next)) throw new Error('Invalid cart total');
    return next;
  }, 0);
}

/** Demo status from simulated time: 0 queued, 1-29 preparing, 30+ served. */
export function orderStatus(
  order: Pick<PlacedOrder, 'placedAtMinute'>,
  currentElapsedMinutes: number,
): OrderStatus {
  const delta = currentElapsedMinutes - order.placedAtMinute;
  if (delta >= SERVED_AFTER_MINUTES) return 'served';
  return delta >= 1 ? 'preparing' : 'queued';
}

/** Copy lines still on the menu, repriced at the CURRENT menu price. */
export function reorderLines(
  lastOrder: PlacedOrder,
  currentMenu: MenuItem[],
): { lines: CartLine[]; dropped: string[] } {
  const lines: CartLine[] = [];
  const dropped: string[] = [];
  for (const line of lastOrder.lines) {
    const item = currentMenu.find((entry) => entry.id === line.menuItemId);
    if (!item) dropped.push(line.name);
    else
      lines.push({
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.price,
        quantity: line.quantity,
        note: line.note,
      });
  }
  return { lines, dropped };
}

/** Orders of this live session. Entries claiming to be placed in the future
 * belong to an earlier session that reused the same id (demo reset), so hide them. */
export function ordersForSession(
  orders: PlacedOrder[],
  session: Pick<Session, 'id' | 'venueId' | 'elapsedMinutes'>,
): PlacedOrder[] {
  return orders.filter(
    (order) =>
      order.sessionId === session.id &&
      order.venueId === session.venueId &&
      order.placedAtMinute <= session.elapsedMinutes,
  );
}
