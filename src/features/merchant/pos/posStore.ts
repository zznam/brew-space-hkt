import { createStore } from 'zustand/vanilla';
import type { ActionResult } from '@/core';
import type {
  FulfillmentStatus,
  PaymentMethod,
  PosOrder,
  PosOrderLine,
} from './types';

const FULFILLMENT_SEQUENCE: FulfillmentStatus[] = [
  'queued',
  'preparing',
  'ready',
  'served',
];

function assertValidLine(line: Pick<PosOrderLine, 'unitPrice' | 'quantity'>) {
  if (!Number.isSafeInteger(line.unitPrice) || line.unitPrice < 0)
    throw new Error('Invalid unit price');
  if (!Number.isSafeInteger(line.quantity) || line.quantity < 1)
    throw new Error('Invalid quantity');
}

export function calculateOrderTotal(order: PosOrder): number {
  return order.lines.reduce((sum, line) => {
    assertValidLine(line);
    return sum + line.unitPrice * line.quantity;
  }, 0);
}

function isEditable(order: PosOrder): boolean {
  return order.status === 'draft';
}

export interface PosStore {
  orders: PosOrder[];
  soldOutItemIds: string[];
  nextOrderId: number;
  createOrder: (venueId: string, seatId: string | null) => string;
  addLine: (
    orderId: string,
    menuItemId: string,
    name: string,
    unitPrice: number,
  ) => ActionResult;
  setLineQuantity: (
    orderId: string,
    menuItemId: string,
    quantity: number,
  ) => ActionResult;
  toggleSoldOut: (menuItemId: string) => void;
  pay: (orderId: string, method: PaymentMethod) => ActionResult;
  cancelOrder: (orderId: string) => ActionResult;
  advanceTicket: (orderId: string, next: FulfillmentStatus) => ActionResult;
  reset: () => void;
}

const initialPosState = () => ({
  orders: [] as PosOrder[],
  soldOutItemIds: [] as string[],
  nextOrderId: 1,
});

/** Factory isolates tests, mirrors src/core/store.ts's createAppStore. */
export function createPosStore() {
  return createStore<PosStore>()((set, get) => ({
    ...initialPosState(),
    createOrder: (venueId, seatId) => {
      const state = get();
      const id = `pos-${state.nextOrderId}`;
      const order: PosOrder = {
        id,
        venueId,
        seatId,
        lines: [],
        status: 'draft',
        fulfillment: null,
        paymentMethod: null,
        createdAt: Date.now(),
      };
      set({
        nextOrderId: state.nextOrderId + 1,
        orders: [...state.orders, order],
      });
      return id;
    },
    addLine: (orderId, menuItemId, name, unitPrice) => {
      const state = get();
      const order = state.orders.find((entry) => entry.id === orderId);
      if (!order) return { ok: false, message: 'Order not found.' };
      if (!isEditable(order))
        return { ok: false, message: 'Order can no longer be edited.' };
      if (state.soldOutItemIds.includes(menuItemId))
        return { ok: false, message: 'Item is sold out.' };
      const existing = order.lines.find(
        (line) => line.menuItemId === menuItemId,
      );
      const lines = existing
        ? order.lines.map((line) =>
            line.menuItemId === menuItemId
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...order.lines, { menuItemId, name, unitPrice, quantity: 1 }];
      set({
        orders: state.orders.map((entry) =>
          entry.id === orderId ? { ...entry, lines } : entry,
        ),
      });
      return { ok: true };
    },
    setLineQuantity: (orderId, menuItemId, quantity) => {
      const state = get();
      const order = state.orders.find((entry) => entry.id === orderId);
      if (!order) return { ok: false, message: 'Order not found.' };
      if (!isEditable(order))
        return { ok: false, message: 'Order can no longer be edited.' };
      if (!Number.isSafeInteger(quantity) || quantity < 0)
        return { ok: false, message: 'Invalid quantity.' };
      const hasLine = order.lines.some(
        (line) => line.menuItemId === menuItemId,
      );
      if (!hasLine) return { ok: false, message: 'Line not found.' };
      const lines =
        quantity === 0
          ? order.lines.filter((line) => line.menuItemId !== menuItemId)
          : order.lines.map((line) =>
              line.menuItemId === menuItemId ? { ...line, quantity } : line,
            );
      set({
        orders: state.orders.map((entry) =>
          entry.id === orderId ? { ...entry, lines } : entry,
        ),
      });
      return { ok: true };
    },
    toggleSoldOut: (menuItemId) => {
      const state = get();
      set({
        soldOutItemIds: state.soldOutItemIds.includes(menuItemId)
          ? state.soldOutItemIds.filter((id) => id !== menuItemId)
          : [...state.soldOutItemIds, menuItemId],
      });
    },
    pay: (orderId, method) => {
      const state = get();
      const order = state.orders.find((entry) => entry.id === orderId);
      if (!order) return { ok: false, message: 'Order not found.' };
      if (order.status !== 'draft')
        return { ok: false, message: 'Order cannot be paid from this state.' };
      if (order.lines.length === 0)
        return { ok: false, message: 'Cannot pay an empty order.' };
      set({
        orders: state.orders.map((entry) =>
          entry.id === orderId
            ? {
                ...entry,
                status: 'paid',
                fulfillment: 'queued',
                paymentMethod: method,
              }
            : entry,
        ),
      });
      return { ok: true };
    },
    cancelOrder: (orderId) => {
      const state = get();
      const order = state.orders.find((entry) => entry.id === orderId);
      if (!order) return { ok: false, message: 'Order not found.' };
      if (order.status !== 'draft')
        return { ok: false, message: 'Only a draft order can be cancelled.' };
      set({
        orders: state.orders.map((entry) =>
          entry.id === orderId ? { ...entry, status: 'cancelled' } : entry,
        ),
      });
      return { ok: true };
    },
    advanceTicket: (orderId, next) => {
      const state = get();
      const order = state.orders.find((entry) => entry.id === orderId);
      if (!order || order.fulfillment === null)
        return { ok: false, message: 'Order has no ticket.' };
      const currentIndex = FULFILLMENT_SEQUENCE.indexOf(order.fulfillment);
      const nextIndex = FULFILLMENT_SEQUENCE.indexOf(next);
      if (nextIndex !== currentIndex + 1)
        return { ok: false, message: 'Cannot skip fulfillment steps.' };
      set({
        orders: state.orders.map((entry) =>
          entry.id === orderId ? { ...entry, fulfillment: next } : entry,
        ),
      });
      return { ok: true };
    },
    reset: () => set(initialPosState()),
  }));
}
