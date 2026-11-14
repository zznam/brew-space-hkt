import { createStore } from 'zustand/vanilla';
import {
  DEMO_CUSTOMER_ID,
  getVenue,
  type ActionResult,
  type AppStore,
  type MenuItem,
  type Session,
} from '../../../core';
import type { Preferences } from '../loyalty/loyaltyModel';
import type { SupportContext } from '../support/supportStore';
import {
  addToCart,
  allergyRequestText,
  cartTotal,
  isDrink,
  lineKey,
  modifiersFromPreferences,
  ordersForSession,
  removeLine,
  reorderLines,
  setModifiers,
  setNote,
  setQuantity,
  type CartLine,
  type Modifiers,
  type PlacedOrder,
} from './cartModel';

/** Minimal slice of the core store the cart needs; tests pass createAppStore(). */
export interface CoreStoreLike {
  getState: () => Pick<AppStore, 'venueId' | 'sessions' | 'addItem'>;
}

/** Side effects injected by the app (and by tests), so this store imports no
 * React bindings and no other feature's singleton. Both are optional: without
 * them the customer is a guest and no staff request is raised. */
export interface CartDeps {
  /** Saved preferences when the customer is a member at this venue (read-only
   * view of the loyalty state); null for guests. */
  getSavedPreferences?: (venueId: string) => Preferences | null;
  /** Raise a staff support request. Called once per placed order when an
   * allergy note is on file. A failed or throwing notifier never blocks the
   * order; the customer sees a warning instead. */
  notifyStaff?: (
    ctx: SupportContext,
    text: string,
  ) => { ok: true } | { ok: false; message: string };
}

export type ReorderResult =
  { ok: true; dropped: string[] } | { ok: false; message: string };

export interface CartStore {
  lines: CartLine[];
  orders: PlacedOrder[];
  nextOrderId: number;
  error: string | null;
  notice: string | null;
  /** Non-blocking problem after an order that DID go through (e.g. the allergy
   * request to staff failed). Shown separately from `error`. */
  warning: string | null;
  /** True while the cart holds a drink line that started from saved preferences. */
  prefilled: boolean;
  /** Drinks start from saved preferences (members) or defaults (guests). */
  addItem: (item: MenuItem) => void;
  /** Line actions take a lineKey (item id + modifiers). */
  setQuantity: (key: string, quantity: number) => void;
  setNote: (key: string, note: string) => void;
  setModifiers: (key: string, patch: Partial<Modifiers>) => void;
  removeLine: (key: string) => void;
  dismissMessages: () => void;
  /** Place the cart as one order. */
  submit: (session: Session) => ActionResult;
  /** Re-place the session's latest order at current prices; cart is untouched. */
  reorder: (session: Session) => ReorderResult;
  /** Forget everything tied to a session (call when it ends). */
  forgetSession: (sessionId: string) => void;
  reset: () => void;
}

const initial = () => ({
  lines: [] as CartLine[],
  orders: [] as PlacedOrder[],
  nextOrderId: 1,
  error: null as string | null,
  notice: null as string | null,
  warning: null as string | null,
  prefilled: false,
});

type PlaceResult =
  | { ok: true; live: Session; sent: CartLine[] }
  | { ok: false; message: string; live?: Session; sent: CartLine[] };

/** The core store stays the source of truth for the bill: every unit goes through
 * core `addItem`. This store only keeps cart state and the customer's order log. */
export function createCartStore(coreStore: CoreStoreLike, deps: CartDeps = {}) {
  return createStore<CartStore>()((set, get) => {
    const fail = (message: string): { ok: false; message: string } => {
      set({ error: message, notice: null, warning: null });
      return { ok: false, message };
    };

    /** Send lines to core one unit at a time; reports exactly what core accepted. */
    function place(session: Session, lines: CartLine[]): PlaceResult {
      if (lines.length === 0)
        return { ok: false, message: 'Your cart is empty.', sent: [] };
      const core = coreStore.getState();
      const live = core.sessions.find(
        (entry) =>
          entry.id === session.id &&
          entry.venueId === core.venueId &&
          entry.customerId === DEMO_CUSTOMER_ID,
      );
      if (!live)
        return {
          ok: false,
          message: 'This session is not available in the current venue.',
          sent: [],
        };
      const menu = getVenue(core.venueId).menu;
      // Validate everything first so a known problem never half-orders.
      const priced: CartLine[] = [];
      for (const line of lines) {
        const item = menu.find((entry) => entry.id === line.menuItemId);
        if (!item)
          return {
            ok: false,
            message: `${line.name} is not on this venue's menu. Remove it and try again.`,
            sent: [],
          };
        priced.push({ ...line, name: item.name, unitPrice: item.price });
      }
      const sent: CartLine[] = [];
      for (const line of priced) {
        let units = 0;
        while (
          units < line.quantity &&
          core.addItem(live.id, line.menuItemId).ok
        )
          units++;
        if (units > 0) sent.push({ ...line, quantity: units });
        if (units < line.quantity)
          return {
            ok: false,
            message: `Could not add ${line.name} (${units} of ${line.quantity} sent). Check your tab and try again.`,
            live,
            sent,
          };
      }
      return { ok: true, live, sent };
    }

    /** Log what core accepted (also after a partial failure: it is on the bill). */
    function record(live: Session, sent: CartLine[]) {
      if (sent.length === 0) return;
      const { orders } = get();
      let n = get().nextOrderId;
      while (orders.some((order) => order.id === `order-${n}`)) n++;
      const order: PlacedOrder = {
        id: `order-${n}`,
        venueId: live.venueId,
        sessionId: live.id,
        lines: sent,
        total: cartTotal(sent),
        placedAtMinute: live.elapsedMinutes,
      };
      set({ orders: [...orders, order], nextOrderId: n + 1 });
    }

    /** Members with an allergy on file get a staff request with every order
     * that reached the bill. Returns a warning when it could not be raised;
     * the order itself is never undone. */
    function notifyAllergy(live: Session, sent: CartLine[]): string | null {
      if (sent.length === 0) return null;
      const note = deps.getSavedPreferences?.(live.venueId)?.allergyNote.trim();
      if (!note) return null;
      const failed = (reason: string) =>
        `Your order went through, but your allergy note could not be sent to staff (${reason}). Please tell staff about your allergy directly.`;
      if (!deps.notifyStaff) return failed('staff requests are unavailable');
      try {
        const result = deps.notifyStaff(
          {
            venueId: live.venueId,
            seatId: live.seatId,
            sessionId: live.id,
            minute: live.elapsedMinutes,
          },
          allergyRequestText(note, sent),
        );
        return result.ok ? null : failed(result.message);
      } catch {
        return failed('unexpected error');
      }
    }

    /** Clear the prefill hint once the cart is empty. */
    const keepPrefilled = (lines: CartLine[]) =>
      lines.length > 0 && get().prefilled;

    return {
      ...initial(),
      addItem: (item) =>
        set((state) => {
          const saved = isDrink(item)
            ? deps.getSavedPreferences?.(coreStore.getState().venueId)
            : null;
          const modifiers = isDrink(item)
            ? modifiersFromPreferences(saved)
            : null;
          const key = lineKey({ menuItemId: item.id, modifiers });
          const isNewLine = !state.lines.some((line) => lineKey(line) === key);
          return {
            lines: addToCart(state.lines, item, modifiers),
            prefilled: state.prefilled || (Boolean(saved) && isNewLine),
            error: null,
            notice: null,
            warning: null,
          };
        }),
      setQuantity: (key, quantity) =>
        set((state) => {
          const lines = setQuantity(state.lines, key, quantity);
          return { lines, prefilled: keepPrefilled(lines) };
        }),
      setNote: (key, note) =>
        set((state) => ({ lines: setNote(state.lines, key, note) })),
      setModifiers: (key, patch) =>
        set((state) => ({ lines: setModifiers(state.lines, key, patch) })),
      removeLine: (key) =>
        set((state) => {
          const lines = removeLine(state.lines, key);
          return { lines, prefilled: keepPrefilled(lines) };
        }),
      dismissMessages: () => set({ error: null, notice: null, warning: null }),
      submit: (session) => {
        const result = place(session, get().lines);
        if (result.ok) {
          record(result.live, result.sent);
          set({
            lines: [],
            prefilled: false,
            error: null,
            notice: 'Order placed.',
            warning: notifyAllergy(result.live, result.sent),
          });
          return { ok: true };
        }
        if (result.live) {
          record(result.live, result.sent);
          const warning = notifyAllergy(result.live, result.sent);
          // Keep only the unsent remainder in the cart.
          const rest = get()
            .lines.map((line) => {
              const sent = result.sent.find(
                (entry) => lineKey(entry) === lineKey(line),
              );
              return sent
                ? { ...line, quantity: line.quantity - sent.quantity }
                : line;
            })
            .filter((line) => line.quantity > 0);
          const failure = fail(result.message);
          set({ lines: rest, prefilled: keepPrefilled(rest), warning });
          return failure;
        }
        return fail(result.message);
      },
      reorder: (session) => {
        const core = coreStore.getState();
        const previous = ordersForSession(get().orders, session);
        const last = previous[previous.length - 1];
        if (!last) return fail('There is no earlier order to repeat.');
        const { lines, dropped } = reorderLines(
          last,
          getVenue(core.venueId).menu,
        );
        if (lines.length === 0)
          return fail('None of those items are on the menu any more.');
        const result = place(session, lines);
        if (result.live) record(result.live, result.sent);
        const warning = result.live
          ? notifyAllergy(result.live, result.sent)
          : null;
        if (!result.ok) {
          const failure = fail(result.message);
          set({ warning });
          return failure;
        }
        set({
          error: null,
          warning,
          notice: dropped.length
            ? `Order placed. No longer available: ${dropped.join(', ')}.`
            : 'Order placed.',
        });
        return { ok: true, dropped };
      },
      forgetSession: (sessionId) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.sessionId !== sessionId),
          lines: [],
          prefilled: false,
          error: null,
          notice: null,
          warning: null,
        })),
      reset: () => set(initial()),
    };
  });
}
