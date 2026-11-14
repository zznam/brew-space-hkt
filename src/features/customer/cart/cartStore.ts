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
import { cartText, type CartMessage } from './messages';

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
  /** English text of the latest problem, notice and warning. The UI renders
   * the matching `*Message` code in the viewer's language instead. */
  error: string | null;
  notice: string | null;
  /** Non-blocking problem after an order that DID go through (e.g. the allergy
   * request to staff failed). Shown separately from `error`. */
  warning: string | null;
  /** Language-neutral codes behind `error`, `notice` and `warning`; render
   * with `cartText(message, lang)`. */
  errorMessage: CartMessage | null;
  noticeMessage: CartMessage | null;
  warningMessage: CartMessage | null;
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

const textOf = (message: CartMessage | null) =>
  message ? cartText(message) : null;
/** The English text and its language-neutral code always change together. */
const messageFields = (
  error: CartMessage | null,
  notice: CartMessage | null,
  warning: CartMessage | null,
) => ({
  error: textOf(error),
  notice: textOf(notice),
  warning: textOf(warning),
  errorMessage: error,
  noticeMessage: notice,
  warningMessage: warning,
});

const initial = () => ({
  lines: [] as CartLine[],
  orders: [] as PlacedOrder[],
  nextOrderId: 1,
  ...messageFields(null, null, null),
  prefilled: false,
});

type PlaceResult =
  | { ok: true; live: Session; sent: CartLine[] }
  | { ok: false; message: CartMessage; live?: Session; sent: CartLine[] };

/** The core store stays the source of truth for the bill: every unit goes through
 * core `addItem`. This store only keeps cart state and the customer's order log. */
export function createCartStore(coreStore: CoreStoreLike, deps: CartDeps = {}) {
  return createStore<CartStore>()((set, get) => {
    const fail = (message: CartMessage): { ok: false; message: string } => {
      set(messageFields(message, null, null));
      return { ok: false, message: cartText(message) };
    };

    /** Send lines to core one unit at a time; reports exactly what core accepted. */
    function place(session: Session, lines: CartLine[]): PlaceResult {
      if (lines.length === 0)
        return { ok: false, message: { key: 'emptyCart' }, sent: [] };
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
          message: { key: 'sessionUnavailable' },
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
            message: { key: 'itemGone', params: { name: line.name } },
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
            message: {
              key: 'partial',
              params: { name: line.name, units, quantity: line.quantity },
            },
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
    function notifyAllergy(
      live: Session,
      sent: CartLine[],
    ): CartMessage | null {
      if (sent.length === 0) return null;
      const note = deps.getSavedPreferences?.(live.venueId)?.allergyNote.trim();
      if (!note) return null;
      const failed = (reason: string): CartMessage => ({
        key: 'allergyFailedReason',
        params: { reason },
      });
      if (!deps.notifyStaff) return { key: 'allergyFailedUnavailable' };
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
        return { key: 'allergyFailedUnexpected' };
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
            ...messageFields(null, null, null),
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
      dismissMessages: () => set(messageFields(null, null, null)),
      submit: (session) => {
        const result = place(session, get().lines);
        if (result.ok) {
          record(result.live, result.sent);
          set({
            lines: [],
            prefilled: false,
            ...messageFields(
              null,
              { key: 'orderPlaced' },
              notifyAllergy(result.live, result.sent),
            ),
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
          set({
            lines: rest,
            prefilled: keepPrefilled(rest),
            warning: textOf(warning),
            warningMessage: warning,
          });
          return failure;
        }
        return fail(result.message);
      },
      reorder: (session) => {
        const core = coreStore.getState();
        const previous = ordersForSession(get().orders, session);
        const last = previous[previous.length - 1];
        if (!last) return fail({ key: 'noEarlierOrder' });
        const { lines, dropped } = reorderLines(
          last,
          getVenue(core.venueId).menu,
        );
        if (lines.length === 0) return fail({ key: 'noneOnMenu' });
        const result = place(session, lines);
        if (result.live) record(result.live, result.sent);
        const warning = result.live
          ? notifyAllergy(result.live, result.sent)
          : null;
        if (!result.ok) {
          const failure = fail(result.message);
          set({ warning: textOf(warning), warningMessage: warning });
          return failure;
        }
        set(
          messageFields(
            null,
            dropped.length
              ? {
                  key: 'orderPlacedDropped',
                  params: { names: dropped.join(', ') },
                }
              : { key: 'orderPlaced' },
            warning,
          ),
        );
        return { ok: true, dropped };
      },
      forgetSession: (sessionId) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.sessionId !== sessionId),
          lines: [],
          prefilled: false,
          ...messageFields(null, null, null),
        })),
      reset: () => set(initial()),
    };
  });
}
