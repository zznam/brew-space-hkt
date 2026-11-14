import { describe, expect, it } from 'vitest';
import { calculateBill, createAppStore, getVenue } from '../src/core';
import {
  addToCart,
  cartTotal,
  MAX_LINE_QUANTITY,
  MAX_NOTE_LENGTH,
  orderStatus,
  ordersForSession,
  removeLine,
  reorderLines,
  setNote,
  setQuantity,
  type CartLine,
  type PlacedOrder,
} from '../src/features/customer/cart/cartModel';
import { createCartStore } from '../src/features/customer/cart/cartStore';

const drink = { id: 'grind-drink', name: 'Cold brew', price: 45000 };
const snack = { id: 'grind-snack', name: 'Butter croissant', price: 35000 };

const demo = (core: ReturnType<typeof createAppStore>) =>
  core.getState().sessions.find((s) => s.id === 'demo-1')!;

function startedSession() {
  const core = createAppStore();
  core.getState().selectSeat('grind-seat-8');
  expect(core.getState().startSession('METERED_OPEN').ok).toBe(true);
  const cart = createCartStore(core);
  const session = () =>
    core.getState().sessions.find((s) => s.id === 'demo-1')!;
  return { core, cart, session };
}

describe('cart model', () => {
  it('adds, merges and caps quantities', () => {
    let lines = addToCart([], drink);
    expect(lines).toEqual([
      {
        menuItemId: drink.id,
        name: drink.name,
        unitPrice: 45000,
        quantity: 1,
        note: '',
      },
    ]);
    lines = addToCart(lines, drink);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
    expect(setQuantity(lines, drink.id, 999)[0]?.quantity).toBe(
      MAX_LINE_QUANTITY,
    );
    for (let i = 0; i < 40; i++) lines = addToCart(lines, drink);
    expect(lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });
  it('removes the line when quantity is zero or negative', () => {
    const lines = addToCart(addToCart([], drink), snack);
    expect(setQuantity(lines, drink.id, 0).map((l) => l.menuItemId)).toEqual([
      snack.id,
    ]);
    expect(setQuantity(lines, drink.id, -3)).toHaveLength(1);
    expect(setQuantity(lines, drink.id, Number.NaN)).toBe(lines);
    expect(removeLine(lines, snack.id)).toHaveLength(1);
  });
  it('does not mutate its input', () => {
    const lines = addToCart([], drink);
    const frozen = JSON.stringify(lines);
    setQuantity(lines, drink.id, 5);
    setNote(lines, drink.id, 'x');
    addToCart(lines, drink);
    expect(JSON.stringify(lines)).toBe(frozen);
  });
  it('trims notes and limits them to 120 characters', () => {
    const lines = addToCart([], drink);
    expect(setNote(lines, drink.id, '  less ice  ')[0]?.note).toBe('less ice');
    const long = setNote(lines, drink.id, 'a'.repeat(500))[0]?.note ?? '';
    expect(long).toHaveLength(MAX_NOTE_LENGTH);
  });
  it('totals integer VND and rejects invalid lines', () => {
    expect(cartTotal([])).toBe(0);
    const lines = setQuantity(
      addToCart(addToCart([], drink), snack),
      drink.id,
      2,
    );
    expect(cartTotal(lines)).toBe(125000);
    const bad = (patch: Partial<CartLine>) => [
      { ...addToCart([], drink)[0]!, ...patch },
    ];
    expect(() => cartTotal(bad({ unitPrice: 1.5 }))).toThrow();
    expect(() => cartTotal(bad({ unitPrice: -1 }))).toThrow();
    expect(() => cartTotal(bad({ quantity: 0 }))).toThrow();
    expect(() =>
      cartTotal(bad({ unitPrice: Number.MAX_SAFE_INTEGER, quantity: 2 })),
    ).toThrow();
    expect(() => addToCart([], { ...drink, price: 0.5 })).toThrow();
  });
});

describe('order status', () => {
  const order = { placedAtMinute: 10 };
  it.each([
    [10, 'queued'],
    [11, 'preparing'],
    [39, 'preparing'],
    [40, 'served'],
    [100, 'served'],
    [5, 'queued'],
  ] as const)('at %i minutes the order is %s', (now, status) => {
    expect(orderStatus(order, now)).toBe(status);
  });
});

describe('reorder', () => {
  const last: PlacedOrder = {
    id: 'order-1',
    venueId: 'grind',
    sessionId: 'demo-1',
    lines: [
      {
        ...addToCart([], drink)[0]!,
        unitPrice: 40000,
        quantity: 2,
        note: 'hot',
      },
      { ...addToCart([], snack)[0]!, name: 'Old croissant' },
      {
        menuItemId: 'retired',
        name: 'Retired cake',
        unitPrice: 20000,
        quantity: 1,
        note: '',
      },
    ],
    total: 0,
    placedAtMinute: 0,
  };
  it('reprices from the current menu and reports dropped items', () => {
    const result = reorderLines(last, [drink, { ...snack, price: 38000 }]);
    expect(result.dropped).toEqual(['Retired cake']);
    expect(result.lines).toEqual([
      {
        menuItemId: drink.id,
        name: 'Cold brew',
        unitPrice: 45000,
        quantity: 2,
        note: 'hot',
      },
      {
        menuItemId: snack.id,
        name: 'Butter croissant',
        unitPrice: 38000,
        quantity: 1,
        note: '',
      },
    ]);
  });
  it('returns nothing when the whole menu changed', () => {
    expect(reorderLines(last, [])).toEqual({
      lines: [],
      dropped: ['Cold brew', 'Old croissant', 'Retired cake'],
    });
  });
  it('hides orders from a different or restarted session', () => {
    const session = { id: 'demo-1', venueId: 'grind', elapsedMinutes: 0 };
    const future = { ...last, id: 'order-2', placedAtMinute: 60 };
    const other = { ...last, id: 'order-3', sessionId: 'demo-2' };
    expect(
      ordersForSession([last, future, other], session).map((o) => o.id),
    ).toEqual(['order-1']);
  });
});

describe('cart store submit', () => {
  it('adds one core unit per cart unit and records the order', () => {
    const { core, cart, session } = startedSession();
    const menu = getVenue('grind').menu;
    cart.getState().addItem(menu[0]!);
    cart.getState().addItem(menu[0]!);
    cart.getState().addItem(menu[1]!);
    expect(cart.getState().submit(session())).toEqual({ ok: true });
    const orders = demo(core).orders;
    expect(orders.map((o) => [o.menuItemId, o.quantity])).toEqual([
      ['grind-drink', 1],
      ['grind-drink', 1],
      ['grind-snack', 1],
    ]);
    expect(calculateBill(session()).items).toBe(125000);
    const state = cart.getState();
    expect(state.lines).toEqual([]);
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0]).toMatchObject({
      id: 'order-1',
      venueId: 'grind',
      sessionId: 'demo-1',
      total: 125000,
      placedAtMinute: 0,
    });
  });
  it('records the elapsed minute and tracks status after advancing time', () => {
    const { core, cart, session } = startedSession();
    core.getState().advanceTime();
    cart.getState().addItem(drink);
    cart.getState().submit(session());
    const order = cart.getState().orders[0]!;
    expect(order.placedAtMinute).toBe(30);
    expect(orderStatus(order, session().elapsedMinutes)).toBe('queued');
    core.getState().advanceTime();
    expect(orderStatus(order, session().elapsedMinutes)).toBe('served');
  });
  it('refuses an empty cart without touching core', () => {
    const { core, cart, session } = startedSession();
    const result = cart.getState().submit(session());
    expect(result.ok).toBe(false);
    expect(cart.getState().error).toMatch(/empty/i);
    expect(demo(core).orders).toEqual([]);
    expect(cart.getState().orders).toEqual([]);
  });
  it('refuses a session that is not the demo customer in this venue', () => {
    const { core, cart, session } = startedSession();
    cart.getState().addItem(drink);
    const foreign = core
      .getState()
      .sessions.find((s) => s.customerId !== 'demo-guest')!;
    expect(cart.getState().submit(foreign).ok).toBe(false);
    expect(cart.getState().submit({ ...session(), id: 'missing' }).ok).toBe(
      false,
    );
    core.getState().setVenue('matcha');
    expect(cart.getState().submit(session()).ok).toBe(false);
    core.getState().setVenue('grind');
    expect(session().orders).toEqual([]);
    expect(cart.getState().lines).toHaveLength(1);
    expect(cart.getState().orders).toEqual([]);
  });
  it('rejects unknown menu items before sending anything', () => {
    const { cart, session } = startedSession();
    cart.getState().addItem(drink);
    cart
      .getState()
      .addItem({ id: 'matcha-drink', name: 'Oat matcha', price: 45000 });
    expect(cart.getState().submit(session()).ok).toBe(false);
    expect(session().orders).toEqual([]);
    expect(cart.getState().lines).toHaveLength(2);
  });
  it('stops on a core failure, logs what was sent and keeps the rest', () => {
    const core = createAppStore();
    core.getState().selectSeat('grind-seat-8');
    core.getState().startSession('METERED_OPEN');
    let calls = 0;
    const flaky = {
      getState: () => ({
        ...core.getState(),
        addItem: (sessionId: string, itemId: string) =>
          ++calls > 3
            ? { ok: false as const, message: 'boom' }
            : core.getState().addItem(sessionId, itemId),
      }),
    };
    const cart = createCartStore(flaky);
    cart.getState().addItem(drink);
    for (let i = 0; i < 2; i++) cart.getState().addItem(snack);
    cart.getState().addItem(snack);
    cart.getState().setQuantity(drink.id, 2);
    const session = demo(core);
    const result = cart.getState().submit(session);
    expect(result.ok).toBe(false);
    expect(calls).toBe(4);
    // drink x2 and snack x1 were accepted, snack x2 remain.
    expect(demo(core).orders).toHaveLength(3);
    expect(cart.getState().error).toMatch(/Butter croissant/);
    expect(cart.getState().lines).toMatchObject([
      { menuItemId: snack.id, quantity: 2 },
    ]);
    expect(cart.getState().orders).toHaveLength(1);
    expect(cart.getState().orders[0]?.total).toBe(125000);
  });
});

describe('cart store reorder', () => {
  it('repeats the latest order at current prices without touching the cart', () => {
    const { core, cart, session } = startedSession();
    expect(cart.getState().reorder(session()).ok).toBe(false);
    cart.getState().addItem(drink);
    cart.getState().setQuantity(drink.id, 2);
    cart.getState().setNote(drink.id, ' hot ');
    cart.getState().submit(session());
    cart.getState().addItem(snack);
    const result = cart.getState().reorder(session());
    expect(result).toEqual({ ok: true, dropped: [] });
    expect(demo(core).orders).toHaveLength(4);
    expect(cart.getState().orders).toHaveLength(2);
    expect(cart.getState().orders[1]?.lines[0]?.note).toBe('hot');
    expect(cart.getState().lines).toHaveLength(1);
  });
  it('drops items that left the menu and fails when nothing remains', () => {
    const { core, cart, session } = startedSession();
    cart.getState().addItem(drink);
    cart.getState().submit(session());
    // Simulate a stale order referencing an item the venue no longer sells.
    cart.setState({
      orders: cart.getState().orders.map((o) => ({
        ...o,
        lines: [
          ...o.lines,
          { ...o.lines[0]!, menuItemId: 'gone', name: 'Gone cake' },
        ],
      })),
    });
    const result = cart.getState().reorder(session());
    expect(result).toEqual({ ok: true, dropped: ['Gone cake'] });
    expect(cart.getState().notice).toMatch(/Gone cake/);
    expect(demo(core).orders).toHaveLength(2);
    cart.setState({
      orders: cart.getState().orders.map((o) => ({
        ...o,
        lines: o.lines.map((l) => ({ ...l, menuItemId: 'gone' })),
      })),
    });
    expect(cart.getState().reorder(session()).ok).toBe(false);
  });
  it('forgets orders when a session ends', () => {
    const { cart, session } = startedSession();
    cart.getState().addItem(drink);
    cart.getState().submit(session());
    cart.getState().forgetSession('demo-1');
    expect(cart.getState().orders).toEqual([]);
  });
});
