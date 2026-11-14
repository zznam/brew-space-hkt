import { describe, expect, it } from 'vitest';
import { calculateOrderTotal, createPosStore } from '../src/features/merchant/pos/posStore';

describe('pos order totals', () => {
  it('sums line unit price times quantity', () => {
    const order = { id: 'o1', venueId: 'grind', seatId: null, status: 'draft' as const,
      fulfillment: null, paymentMethod: null, createdAt: 0,
      lines: [{ menuItemId: 'grind-drink', name: 'Cold brew', unitPrice: 45000, quantity: 2 }] };
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
    expect(store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000).ok).toBe(true);
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
    expect(store.getState().addLine(id, 'grind-snack', 'Croissant', 35000).ok).toBe(false);
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
    expect(store.getState().setLineQuantity(id, 'grind-drink', -1).ok).toBe(false);
    expect(store.getState().setLineQuantity(id, 'grind-drink', 0).ok).toBe(true);
    expect(store.getState().orders.find((o) => o.id === id)!.lines).toHaveLength(0);
  });

  it('keeps an existing cart line when the item is marked sold out, but blocks new adds', () => {
    const store = createPosStore();
    const id = store.getState().createOrder('grind', null);
    store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000);
    store.getState().toggleSoldOut('grind-drink');
    expect(store.getState().orders.find((o) => o.id === id)!.lines).toHaveLength(1);
    expect(store.getState().addLine(id, 'grind-drink', 'Cold brew', 45000).ok).toBe(false);
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
