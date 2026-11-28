import { describe, expect, it } from 'vitest';
import { getVenue } from '../src/core';
import {
  calculateOrderTotal,
  createPosStore,
  ticketLabel,
} from '../src/features/merchant/pos/posStore';

describe('pos order totals', () => {
  it('sums line unit price times quantity', () => {
    const order = {
      id: 'o1',
      venueId: 'grind',
      seatId: null,
      status: 'draft' as const,
      fulfillment: null,
      paymentMethod: null,
      createdAt: 0,
      lines: [
        {
          menuItemId: 'grind-drink',
          name: 'Cold brew',
          unitPrice: 45000,
          quantity: 2,
        },
      ],
    };
    expect(calculateOrderTotal(order)).toBe(90000);
  });
});

describe('pos store', () => {
  it('creates a draft order scoped to a venue and optional seat', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', 'grind-seat-1');
    const order = store.getState().orders.find((o) => o.id === id);
    expect(order?.venueId).toBe('grind');
    expect(order?.seatId).toBe('grind-seat-1');
    expect(order?.status).toBe('draft');
  });

  it('adds a line and increases total', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    expect(
      store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000).ok,
    ).toBe(true);
    const order = store.getState().orders.find((o) => o.id === id)!;
    expect(calculateOrderTotal(order)).toBe(45000);
  });

  it('increments the existing line instead of duplicating it', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    const order = store.getState().orders.find((o) => o.id === id)!;
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0]!.quantity).toBe(2);
  });

  it('refuses adding a line to an order that is already paid', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    store.getState().pay(id, 'cash');
    expect(
      store.getState().addLine(id, 'grind-snack', 'Croissant', 35000).ok,
    ).toBe(false);
  });

  it('refuses paying an order with no lines', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    expect(store.getState().pay(id, 'cash').ok).toBe(false);
  });

  it('setLineQuantity removes the line at zero and rejects negative', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    expect(store.getState().setLineQuantity(id, 'grind-drink', -1).ok).toBe(
      false,
    );
    expect(store.getState().setLineQuantity(id, 'grind-drink', 0).ok).toBe(
      true,
    );
    expect(
      store.getState().orders.find((o) => o.id === id)!.lines,
    ).toHaveLength(0);
  });

  it('keeps an existing cart line when the item is marked sold out, but blocks new adds', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    store.getState().toggleSoldOut('grind-drink');
    expect(
      store.getState().orders.find((o) => o.id === id)!.lines,
    ).toHaveLength(1);
    expect(
      store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000).ok,
    ).toBe(false);
  });

  it('pays an order with lines, moving it to paid with a queued ticket', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    expect(store.getState().pay(id, 'cash').ok).toBe(true);
    const order = store.getState().orders.find((o) => o.id === id)!;
    expect(order.status).toBe('paid');
    expect(order.fulfillment).toBe('queued');
  });

  it('refuses cancelling an order that is already paid', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    store.getState().pay(id, 'cash');
    expect(store.getState().cancelOrder(id).ok).toBe(false);
  });

  it('advances tickets one step at a time and refuses skipping', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    store.getState().pay(id, 'cash');
    expect(store.getState().advanceTicket(id, 'ready').ok).toBe(false);
    expect(store.getState().advanceTicket(id, 'preparing').ok).toBe(true);
    expect(store.getState().advanceTicket(id, 'ready').ok).toBe(true);
    expect(store.getState().advanceTicket(id, 'served').ok).toBe(true);
  });
});

describe('ticketLabel', () => {
  const venue = getVenue('grind');

  it('shows the seat label for a seat-scoped order', () => {
    const order = {
      id: 'pos-1',
      venueId: 'grind',
      seatId: 'grind-seat-1',
      lines: [],
      status: 'paid' as const,
      fulfillment: 'queued' as const,
      paymentMethod: 'cash' as const,
      createdAt: 0,
    };
    expect(ticketLabel(order, venue)).toBe('Seat 1');
  });

  it('shows a walk-in label with the order id when there is no seat', () => {
    const order = {
      id: 'pos-3',
      venueId: 'grind',
      seatId: null,
      lines: [],
      status: 'paid' as const,
      fulfillment: 'queued' as const,
      paymentMethod: 'cash' as const,
      createdAt: 0,
    };
    expect(ticketLabel(order, venue)).toBe('Walk-in #pos-3');
  });
});

describe('F219 POS favourites', () => {
  it('pins and unpins items, keeping pin order', async () => {
    const { createPosStore } =
      await import('../src/features/merchant/pos/posStore');
    const store = createPosStore();
    store.getState().togglePinned('b');
    store.getState().togglePinned('a');
    expect(store.getState().pinnedItemIds).toEqual(['b', 'a']);
    store.getState().togglePinned('b');
    expect(store.getState().pinnedItemIds).toEqual(['a']);
  });

  it('lists pinned items first in menu order, sold-out items included', async () => {
    const { favouritesFirst } =
      await import('../src/features/merchant/pos/posStore');
    const menu = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(favouritesFirst(menu, ['d', 'b']).map((i) => i.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
    expect(favouritesFirst(menu, []).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(favouritesFirst(menu, ['zzz']).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});
