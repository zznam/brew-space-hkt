import { createStore } from 'zustand/vanilla';
import {
  DEMO_CUSTOMER_ID,
  getVenue,
  type ActionResult,
  type AppStore,
  type MenuItem,
  type Session,
} from '../../../core';
import {
  addToCart,
  cartTotal,
  ordersForSession,
  removeLine,
  reorderLines,
  setNote,
  setQuantity,
  type CartLine,
  type PlacedOrder,
} from './cartModel';

/** Minimal slice of the core store the cart needs; tests pass createAppStore(). */
export interface CoreStoreLike {
  getState: () => Pick<AppStore, 'venueId' | 'sessions' | 'addItem'>;
}

export type ReorderResult =
  { ok: true; dropped: string[] } | { ok: false; message: string };

export interface CartStore {
  lines: CartLine[];
  orders: PlacedOrder[];
  nextOrderId: number;
  error: string | null;
  notice: string | null;
  addItem: (item: MenuItem) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  setNote: (menuItemId: string, note: string) => void;
  removeLine: (menuItemId: string) => void;
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
});

type PlaceResult =
  | { ok: true; live: Session; sent: CartLine[] }
  | { ok: false; message: string; live?: Session; sent: CartLine[] };

/** The core store stays the source of truth for the bill: every unit goes through
 * core `addItem`. This store only keeps cart state and the customer's order log. */
export function createCartStore(coreStore: CoreStoreLike) {
  return createStore<CartStore>()((set, get) => {
    const fail = (message: string): { ok: false; message: string } => {
      set({ error: message, notice: null });
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

    return {
      ...initial(),
      addItem: (item) =>
        set((state) => ({
          lines: addToCart(state.lines, item),
          error: null,
          notice: null,
        })),
      setQuantity: (id, quantity) =>
        set((state) => ({ lines: setQuantity(state.lines, id, quantity) })),
      setNote: (id, note) =>
        set((state) => ({ lines: setNote(state.lines, id, note) })),
      removeLine: (id) =>
        set((state) => ({ lines: removeLine(state.lines, id) })),
      dismissMessages: () => set({ error: null, notice: null }),
      submit: (session) => {
        const result = place(session, get().lines);
        if (result.ok) {
          record(result.live, result.sent);
          set({ lines: [], error: null, notice: 'Order placed.' });
          return { ok: true };
        }
        if (result.live) {
          record(result.live, result.sent);
          // Keep only the unsent remainder in the cart.
          set((state) => ({
            lines: state.lines
              .map((line) => {
                const sent = result.sent.find(
                  (entry) => entry.menuItemId === line.menuItemId,
                );
                return sent
                  ? { ...line, quantity: line.quantity - sent.quantity }
                  : line;
              })
              .filter((line) => line.quantity > 0),
          }));
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
        if (!result.ok) return fail(result.message);
        set({
          error: null,
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
          error: null,
          notice: null,
        })),
      reset: () => set(initial()),
    };
  });
}
