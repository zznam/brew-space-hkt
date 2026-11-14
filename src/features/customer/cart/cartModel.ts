import type { MenuItem, Session } from '../../../core';
import {
  defaultPreferences,
  MILK_OPTIONS,
  SWEETNESS_OPTIONS,
  type Milk,
  type Preferences,
  type Sweetness,
} from '../loyalty/loyaltyModel';
import { MAX_NOTE_LENGTH as SUPPORT_NOTE_LIMIT } from '../support/supportModel';

/** Pure cart/order helpers. No React, no storage; safe to import from tests. */
export const MAX_LINE_QUANTITY = 20;
export const MAX_NOTE_LENGTH = 120;
/** Demo time only moves in 30 minute steps (simulator "+30m"). */
export const SERVED_AFTER_MINUTES = 30;

export const ICE_OPTIONS = ['none', 'less', 'normal'] as const;
export type Ice = (typeof ICE_OPTIONS)[number];

/** Drink options chosen per line. They never change the price: pricing lives
 * only in core billing (src/core/billing.ts), so a modifier is a preparation
 * instruction for staff, not a charge. */
export interface Modifiers {
  milk: Milk;
  sweetness: Sweetness;
  ice: Ice;
}

export interface CartLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
  /** Drinks only; null for food, which has no modifiers. */
  modifiers: Modifiers | null;
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

/* ---------- Modifiers ---------- */

/** Drink vs food rule: the demo menu has no category field, so a menu item is
 * a drink exactly when its id ends in "-drink" (fixtures use `<venue>-drink`
 * and `<venue>-snack`). Everything else is food and has no modifiers. */
export const isDrinkId = (menuItemId: string) => menuItemId.endsWith('-drink');
export const isDrink = (item: Pick<MenuItem, 'id'>) => isDrinkId(item.id);

/** Defaults for guests (and members without saved preferences). */
export function defaultModifiers(): Modifiers {
  const { milk, sweetness } = defaultPreferences();
  return { milk, sweetness, ice: 'normal' };
}

/** Starting modifiers for a new drink line: saved milk and sweetness for a
 * member, defaults otherwise. Ice is never saved, so it starts at normal. */
export function modifiersFromPreferences(
  prefs: Pick<Preferences, 'milk' | 'sweetness'> | null | undefined,
): Modifiers {
  return prefs
    ? { ...defaultModifiers(), milk: prefs.milk, sweetness: prefs.sweetness }
    : defaultModifiers();
}

export function isModifiers(value: unknown): value is Modifiers {
  if (!value || typeof value !== 'object') return false;
  const mods = value as Modifiers;
  return (
    MILK_OPTIONS.includes(mods.milk) &&
    SWEETNESS_OPTIONS.includes(mods.sweetness) &&
    ICE_OPTIONS.includes(mods.ice)
  );
}

/** Food always gets null; a drink keeps valid modifiers or falls back. */
export function modifiersFor(
  menuItemId: string,
  candidate: Modifiers | null | undefined,
  fallback: Modifiers = defaultModifiers(),
): Modifiers | null {
  if (!isDrinkId(menuItemId)) return null;
  return isModifiers(candidate) ? { ...candidate } : { ...fallback };
}

/** A line is identified by item + modifiers, so the same drink with different
 * options is a separate line. Food lines are keyed by item id alone. */
export function lineKey(
  line: Pick<CartLine, 'menuItemId' | 'modifiers'>,
): string {
  const mods = line.modifiers;
  return mods
    ? `${line.menuItemId}|${mods.milk}|${mods.sweetness}|${mods.ice}`
    : line.menuItemId;
}

const MILK_LABEL: Record<Milk, string> = {
  dairy: 'Dairy milk',
  oat: 'Oat milk',
  almond: 'Almond milk',
  none: 'No milk',
};
const ICE_LABEL: Record<Ice, string> = {
  none: 'No ice',
  less: 'Less ice',
  normal: 'Normal ice',
};
export const milkLabel = (milk: Milk) => MILK_LABEL[milk];
export const sweetnessLabel = (sweetness: Sweetness) => `${sweetness}% sugar`;
export const iceLabel = (ice: Ice) => ICE_LABEL[ice];

/** "Oat milk · 30% sugar · Less ice"; empty string for food lines. */
export function formatModifiers(modifiers: Modifiers | null): string {
  if (!modifiers) return '';
  return [
    milkLabel(modifiers.milk),
    sweetnessLabel(modifiers.sweetness),
    iceLabel(modifiers.ice),
  ].join(' · ');
}

/* ---------- Cart lines ---------- */

/** Adds one unit. Merges into the line with the same item AND modifiers.
 * `modifiers` is only used for drinks; food lines always get null. */
export function addToCart(
  lines: CartLine[],
  item: MenuItem,
  modifiers?: Modifiers | null,
): CartLine[] {
  if (!Number.isSafeInteger(item.price) || item.price < 0)
    throw new Error(`Invalid price for ${item.id}`);
  const mods = modifiersFor(item.id, modifiers);
  const key = lineKey({ menuItemId: item.id, modifiers: mods });
  if (lines.some((line) => lineKey(line) === key))
    return lines.map((line) =>
      lineKey(line) === key
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
      modifiers: mods,
    },
  ];
}

/** Quantity <= 0 removes the line; values above the cap are clamped.
 * `key` is a lineKey (item id + modifiers). */
export function setQuantity(
  lines: CartLine[],
  key: string,
  quantity: number,
): CartLine[] {
  if (!Number.isFinite(quantity)) return lines;
  const next = Math.min(MAX_LINE_QUANTITY, Math.trunc(quantity));
  if (next <= 0) return removeLine(lines, key);
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, quantity: next } : line,
  );
}

export function setNote(
  lines: CartLine[],
  key: string,
  note: string,
): CartLine[] {
  const clean = note.trim().slice(0, MAX_NOTE_LENGTH).trim();
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, note: clean } : line,
  );
}

/** Change options on a drink line. Invalid values and food lines are ignored.
 * If the new options match another line of the same item, the two merge
 * (quantities add, capped; the earlier line keeps its position and note). */
export function setModifiers(
  lines: CartLine[],
  key: string,
  patch: Partial<Modifiers>,
): CartLine[] {
  const target = lines.find((line) => lineKey(line) === key);
  if (!target?.modifiers) return lines;
  const merged = { ...target.modifiers, ...patch };
  if (!isModifiers(merged)) return lines;
  const nextKey = lineKey({ ...target, modifiers: merged });
  if (nextKey === key) return lines;
  const twin = lines.find((line) => lineKey(line) === nextKey);
  if (!twin)
    return lines.map((line) =>
      line === target ? { ...line, modifiers: merged } : line,
    );
  const quantity = Math.min(MAX_LINE_QUANTITY, twin.quantity + target.quantity);
  const keepTwin = lines.indexOf(twin) < lines.indexOf(target);
  return lines
    .filter((line) => line !== (keepTwin ? target : twin))
    .map((line) =>
      line === (keepTwin ? twin : target)
        ? { ...line, quantity, modifiers: { ...merged } }
        : line,
    );
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((line) => lineKey(line) !== key);
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

/** Copy lines still on the menu, repriced at the CURRENT menu price. Modifiers
 * are kept for drinks (and defaulted if a line has none). */
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
        modifiers: modifiersFor(item.id, line.modifiers),
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

/* ---------- Allergy request for staff ---------- */

/** Text for the staff support request raised with every order of a member who
 * has an allergy on file. Bounded to the support note limit so validation
 * never rejects it: the allergy note is kept first, the item list is cut. */
export function allergyRequestText(
  allergyNote: string,
  lines: Pick<CartLine, 'name' | 'quantity'>[],
): string {
  const head = `Allergy on file: ${allergyNote.trim()}.`;
  const items = lines.map((line) => `${line.quantity} × ${line.name}`);
  const text = items.length ? `${head} Order: ${items.join(', ')}` : head;
  if (text.length <= SUPPORT_NOTE_LIMIT) return text;
  return `${text.slice(0, SUPPORT_NOTE_LIMIT - 1).trimEnd()}…`;
}

/* ---------- Menu search ---------- */

/** Lowercase, strip diacritics (NFD marks and d-stroke) and collapse spaces. */
export function normaliseSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Items whose name contains the query (case and diacritic insensitive). A
 * blank query returns the whole menu, in menu order. */
export function searchMenu<T extends Pick<MenuItem, 'name'>>(
  menu: T[],
  query: string,
): T[] {
  const needle = normaliseSearch(query);
  if (!needle) return menu;
  return menu.filter((item) => normaliseSearch(item.name).includes(needle));
}
