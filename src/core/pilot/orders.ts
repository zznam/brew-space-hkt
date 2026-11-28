import { z } from 'zod';
import { calculateQuoteTotal } from '../billing';
import {
  activeTenant,
  audit,
  branchById,
  owned,
  rateLimit,
  requireStaff,
  staffActor,
  staffOf,
} from './access';
import { snapshotItem } from './catalogue';
import { newSessionToken, sessionDigest } from './credentials';
import { fail, must } from './errors';
import type { Order, Payment, Quote, Shift, Ticket, Tx } from './types';
import { DAY, MIN, nextId, stable } from './util';
import {
  finishPromotion,
  holdPromotion,
  promotionSchema,
  resolvePromotion,
} from './promotions';

const id = z.string().min(1).max(100);
const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const key = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[\w-]+$/);
const line = z
  .object({
    itemId: id,
    quantity: z.number().int().min(1).max(99),
    sizeId: id.optional(),
    modifiers: z
      .array(z.object({ groupId: id, optionId: id }).strict())
      .max(20)
      .optional(),
    note: z.string().max(200).optional(),
  })
  .strict();
export const quoteSchema = z
  .object({
    branchId: id,
    lines: z.array(line).min(1).max(50),
    promotion: promotionSchema.optional(),
  })
  .strict();
export const orderSchema = z
  .object({ quoteId: id, idempotencyKey: key })
  .strict();
export const orderIdSchema = z.object({ orderId: id }).strict();
export const cancelOrderSchema = orderIdSchema.extend({
  reason: z.string().trim().min(1).max(200),
  idempotencyKey: key,
});
export const branchSchema = z.object({ branchId: id }).strict();
export const shiftSchema = branchSchema.extend({
  openingFloat: money,
  idempotencyKey: key,
});
export const closeShiftSchema = z
  .object({ shiftId: id, countedCash: money, idempotencyKey: key })
  .strict();
export const cashSchema = z
  .object({ orderId: id, shiftId: id, tendered: money, idempotencyKey: key })
  .strict();
export const ticketSchema = z
  .object({
    ticketId: id,
    status: z.enum(['preparing', 'ready', 'served', 'cancelled']),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();
export const confirmServiceSchema = z
  .object({ ticketId: id, lineIndex: z.number().int().min(0).max(49) })
  .strict();
export const feesSchema = z
  .object({
    fees: z
      .array(
        z
          .object({
            id,
            name: z.string().trim().min(1).max(60),
            kind: z.enum(['fixed', 'percent']),
            value: money,
            appliesTo: z.enum(['all', 'items', 'seat']),
          })
          .strict(),
      )
      .max(10)
      .refine(
        (fees) =>
          new Set(fees.map((f) => f.id)).size === fees.length &&
          fees.every((f) => f.kind !== 'percent' || f.value <= 10000),
      ),
  })
  .strict();

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const value = schema.safeParse(input);
  if (!value.success) fail('VALIDATION');
  return value.data;
}
export function idempotent<T>(
  tx: Tx,
  scope: string,
  input: { idempotencyKey: string },
  run: () => T,
): T {
  const name = `${scope}:${input.idempotencyKey}`;
  const payload = stable(input);
  const saved = tx.db.idem[name];
  if (saved) {
    if (saved.hash !== payload) fail('IDEMPOTENCY_CONFLICT');
    return JSON.parse(saved.response) as T;
  }
  const response = run();
  // Canonical payload comparison, not a collision-prone demo digest. No tokens in replies.
  tx.db.idem[name] = { hash: payload, response: JSON.stringify(response) };
  return response;
}
function authorizeQuote(tx: Tx, quoteId: string) {
  const quote = must(tx.db.quotes.find((q) => q.id === quoteId));
  if (quote.createdBy.kind === 'staff') {
    const staff = requireStaff(tx, 'order.staff', quote.branchId);
    if (quote.createdBy.id !== staff.id) fail('NOT_FOUND');
  } else {
    if (
      !(tx.auth.accessTokens ?? []).some(
        (token) => sessionDigest(tx, token) === quote.createdBy.id,
      )
    )
      fail('NOT_FOUND');
    if (
      quote.used &&
      !tx.db.orders.some(
        (order) => order.quoteId === quote.id && order.accessExpiresAt > tx.now,
      )
    )
      fail('NOT_FOUND');
  }
  activeTenant(tx.db, quote.tenantId);
  return quote;
}
export function authorizeOrder(tx: Tx, orderId: string) {
  const order = must(tx.db.orders.find((o) => o.id === orderId));
  if (tx.auth.staffToken) requireStaff(tx, 'order.staff', order.branchId);
  else if (
    order.accessExpiresAt <= tx.now ||
    !order.accessToken ||
    !(tx.auth.accessTokens ?? []).some(
      (token) => sessionDigest(tx, token) === order.accessToken,
    )
  )
    fail('NOT_FOUND');
  activeTenant(tx.db, order.tenantId);
  return order;
}
function orderView(order: Order) {
  const { accessToken: _token, createdBy: _actor, ...view } = order;
  return view;
}
export function configureFees(tx: Tx, value: z.infer<typeof feesSchema>) {
  const staff = requireStaff(tx, 'tenant.config');
  const input = parse(feesSchema, value);
  activeTenant(tx.db, staff.tenantId).settings.fees = input.fees;
  audit(tx, staffActor(staff), 'fees.update', staff.tenantId, {
    tenantId: staff.tenantId,
  });
  return input.fees;
}
export function createQuote(tx: Tx, value: z.infer<typeof quoteSchema>) {
  const input = parse(quoteSchema, value);
  const branch = branchById(tx.db, input.branchId);
  const tenant = activeTenant(tx.db, branch.tenantId);
  const staff = tx.auth.staffToken
    ? requireStaff(tx, 'order.staff', branch.id)
    : null;
  rateLimit(tx, 'checkout', staff?.id ?? tx.auth.clientId ?? 'guest');
  const rawToken = staff ? null : newSessionToken(tx);
  const lines = input.lines.map((line) =>
    snapshotItem(tx, { ...line, branchId: branch.id }),
  );
  const offer = resolvePromotion(tx, branch.id, lines, input.promotion);
  let totals: ReturnType<typeof calculateQuoteTotal>;
  try {
    totals = calculateQuoteTotal(
      lines,
      tenant.settings.fees,
      offer?.promotion.amount ?? 0,
    );
  } catch {
    fail('VALIDATION', 'The quote amount is too large.');
  }
  const quote: Quote = {
    id: nextId(tx.db, 'quo'),
    branchId: branch.id,
    tenantId: tenant.id,
    lines,
    ...totals,
    promotion: offer?.promotion ?? null,
    createdAt: tx.now,
    expiresAt: Math.min(tx.now + 5 * MIN, offer?.expiresAt ?? Infinity),
    used: false,
    channel: staff ? 'counter' : 'customer',
    createdBy: staff
      ? staffActor(staff)
      : { kind: 'guest', id: sessionDigest(tx, rawToken!) },
    memberId: null,
    deliverTo: null,
    sessionRef: null,
    policy: null,
  };
  tx.db.quotes.push(quote);
  const { createdBy: _actor, ...view } = quote;
  return { quote: view, quoteToken: rawToken };
}
export function createOrder(tx: Tx, value: z.infer<typeof orderSchema>) {
  const input = parse(orderSchema, value);
  const quote = authorizeQuote(tx, input.quoteId);
  return idempotent(
    tx,
    `order:${quote.tenantId}:${quote.createdBy.id}`,
    input,
    () => {
      if (quote.expiresAt <= tx.now) fail('QUOTE_EXPIRED');
      if (quote.used) fail('ORDER_STATE');
      // Availability changes refuse checkout; price changes do not rewrite a valid quote.
      for (const line of quote.lines) {
        const item = owned(tx.db.items, line.itemId!, quote.tenantId);
        if (item.archived || item.soldOut) fail('ITEM_UNAVAILABLE');
      }
      const tenant = activeTenant(tx.db, quote.tenantId);
      holdPromotion(tx, quote.branchId, quote.promotion);
      const order: Order = {
        id: nextId(tx.db, 'ord'),
        code: nextId(tx.db, 'receipt'),
        quoteId: quote.id,
        tenantId: quote.tenantId,
        branchId: quote.branchId,
        lines: quote.lines,
        subtotal: quote.subtotal,
        discount: quote.discount,
        promotion: quote.promotion,
        fees: quote.fees,
        total: quote.total,
        channel: quote.channel,
        createdBy: quote.createdBy,
        memberId: null,
        deliverTo: quote.deliverTo,
        sessionRef: null,
        status: 'awaiting_payment',
        history: [
          { status: 'draft', at: tx.now },
          { status: 'awaiting_payment', at: tx.now },
        ],
        paidAmount: 0,
        refundedAmount: 0,
        accessToken: quote.createdBy.kind === 'guest' ? quote.createdBy.id : '',
        accessExpiresAt: tx.now + 7 * DAY,
        payAtCounter: true,
        paymentDeadline: tx.now + tenant.settings.counterPaymentMinutes * MIN,
        correlationId: nextId(tx.db, 'cor'),
        staffAssist: null,
        cancelReason: null,
        notices: [],
        paidAt: null,
        completedAt: null,
        createdAt: tx.now,
      };
      quote.used = true;
      tx.db.orders.push(order);
      return orderView(order);
    },
  );
}
export function getOrder(tx: Tx, value: z.infer<typeof orderIdSchema>) {
  const input = parse(orderIdSchema, value);
  const order = authorizeOrder(tx, input.orderId);
  return {
    order: orderView(order),
    payments: tx.db.payments
      .filter((p) => p.orderId === order.id)
      .map(paymentView),
    tickets: tx.db.tickets
      .filter((t) => t.orderId === order.id)
      .map((t) => ({
        status: t.status,
        lines: t.lines,
        destination: t.destination,
      })),
  };
}
export function paymentView(payment: Payment) {
  return {
    id: payment.id,
    method: payment.method,
    status: payment.status,
    amount: payment.amount,
    excess: payment.excess,
    updatedAt: payment.updatedAt,
  };
}
/** Atomic with the receipt/ledger entry. Retried delivery is handled by the outbox. */
export function markOrderPaid(tx: Tx, order: Order) {
  finishPromotion(tx, order.promotion, true);
  order.status = 'paid';
  order.paidAt = tx.now;
  order.paidAmount = order.total;
  order.history.push({ status: 'paid', at: tx.now });
  tx.db.outbox.push({
    id: nextId(tx.db, 'evt'),
    type: 'order.paid',
    orderId: order.id,
    attempts: 0,
    status: 'pending',
    lastError: null,
  });
}
export function listOrders(tx: Tx, value: z.infer<typeof branchSchema>) {
  const input = parse(branchSchema, value);
  requireStaff(tx, 'order.staff', input.branchId);
  return tx.db.orders
    .filter((o) => o.branchId === input.branchId)
    .map((o) => ({
      ...orderView(o),
      paymentPending: tx.db.payments.some(
        (p) =>
          p.orderId === o.id && ['initiated', 'pending'].includes(p.status),
      ),
      // F217: enough of the settled payment for staff to show the receipt again.
      paidWith: (() => {
        const paid = tx.db.payments.find(
          (p) => p.orderId === o.id && p.status === 'succeeded',
        );
        return paid
          ? {
              method: paid.method,
              amount: paid.amount,
              tendered: paid.tendered,
              change:
                paid.tendered === null ? null : paid.tendered - paid.amount,
            }
          : null;
      })(),
    }));
}
export function cancelOrder(tx: Tx, value: z.infer<typeof cancelOrderSchema>) {
  const input = parse(cancelOrderSchema, value);
  const order = authorizeOrder(tx, input.orderId);
  const actor = tx.auth.staffToken
    ? staffActor(staffOf(tx))
    : { kind: 'guest' as const, id: order.createdBy.id };
  return idempotent(tx, `cancel:${order.id}:${actor.id}`, input, () => {
    if (order.status !== 'awaiting_payment') fail('ORDER_STATE');
    if (
      tx.db.payments.some(
        (p) =>
          p.orderId === order.id && ['initiated', 'pending'].includes(p.status),
      )
    )
      fail('PAYMENT_PENDING');
    order.status = 'cancelled';
    finishPromotion(tx, order.promotion, false);
    order.cancelReason = input.reason;
    order.history.push({ status: 'cancelled', at: tx.now });
    audit(tx, actor, 'order.cancel', order.id, {
      tenantId: order.tenantId,
      branchId: order.branchId,
      meta: { reason: input.reason },
    });
    return orderView(order);
  });
}
export function openShift(tx: Tx, value: z.infer<typeof shiftSchema>) {
  const input = parse(shiftSchema, value);
  const staff = requireStaff(tx, 'shift.use', input.branchId);
  return idempotent(tx, `shift:${staff.tenantId}:${staff.id}`, input, () => {
    if (
      tx.db.shifts.some((s) => s.cashierId === staff.id && s.status === 'open')
    )
      fail('SHIFT_STATE');
    const shift: Shift = {
      id: nextId(tx.db, 'shf'),
      tenantId: staff.tenantId,
      branchId: input.branchId,
      cashierId: staff.id,
      openedAt: tx.now,
      openingFloat: input.openingFloat,
      status: 'open',
      closedAt: null,
      countedCash: null,
      expectedCash: null,
      variance: null,
      pendingPaymentIds: [],
    };
    tx.db.shifts.push(shift);
    audit(tx, staffActor(staff), 'shift.open', shift.id, {
      tenantId: staff.tenantId,
      branchId: shift.branchId,
    });
    return shift;
  });
}
export function listShifts(tx: Tx, value: z.infer<typeof branchSchema>) {
  const input = parse(branchSchema, value);
  const staff = requireStaff(tx, 'shift.use', input.branchId);
  return tx.db.shifts.filter(
    (s) =>
      s.branchId === input.branchId &&
      (staff.role !== 'cashier' || s.cashierId === staff.id),
  );
}
export function closeShift(tx: Tx, value: z.infer<typeof closeShiftSchema>) {
  const input = parse(closeShiftSchema, value);
  const staff = staffOf(tx);
  const shift = owned(tx.db.shifts, input.shiftId, staff.tenantId);
  requireStaff(tx, 'shift.use', shift.branchId);
  if (shift.cashierId !== staff.id) fail('FORBIDDEN');
  return idempotent(tx, `closeShift:${shift.id}:${staff.id}`, input, () => {
    if (shift.status !== 'open') fail('SHIFT_STATE');
    const expected = tx.db.ledger
      .filter((l) => l.shiftId === shift.id && l.method === 'cash')
      .reduce(
        (total, line) =>
          total + BigInt(line.type === 'refund' ? -line.amount : line.amount),
        BigInt(shift.openingFloat),
      );
    if (expected < 0n || expected > BigInt(Number.MAX_SAFE_INTEGER))
      fail('VALIDATION');
    shift.expectedCash = Number(expected);
    shift.countedCash = input.countedCash;
    shift.variance = input.countedCash - shift.expectedCash;
    shift.pendingPaymentIds = tx.db.payments
      .filter(
        (p) =>
          p.shiftId === shift.id && ['initiated', 'pending'].includes(p.status),
      )
      .map((p) => p.id);
    shift.status = 'closed';
    shift.closedAt = tx.now;
    audit(tx, staffActor(staff), 'shift.close', shift.id, {
      tenantId: staff.tenantId,
      branchId: shift.branchId,
      meta: { variance: shift.variance },
    });
    return shift;
  });
}
export function confirmCash(tx: Tx, value: z.infer<typeof cashSchema>) {
  const input = parse(cashSchema, value);
  const staff = staffOf(tx);
  const order = owned(tx.db.orders, input.orderId, staff.tenantId);
  requireStaff(tx, 'cash.confirm', order.branchId);
  return idempotent(tx, `cash:${order.tenantId}:${staff.id}`, input, () => {
    const shift = owned(tx.db.shifts, input.shiftId, staff.tenantId);
    if (
      shift.branchId !== order.branchId ||
      shift.cashierId !== staff.id ||
      shift.status !== 'open'
    )
      fail('NO_OPEN_SHIFT');
    if (order.status !== 'awaiting_payment' || order.paymentDeadline <= tx.now)
      fail('ORDER_STATE');
    if (
      tx.db.payments.some(
        (p) =>
          p.orderId === order.id && ['initiated', 'pending'].includes(p.status),
      )
    )
      fail('PAYMENT_PENDING');
    if (input.tendered < order.total)
      fail('VALIDATION', 'Cash tendered is below the total.');
    const expected =
      tx.db.ledger
        .filter((l) => l.shiftId === shift.id && l.method === 'cash')
        .reduce(
          (sum, l) => sum + BigInt(l.type === 'refund' ? -l.amount : l.amount),
          BigInt(shift.openingFloat),
        ) + BigInt(order.total);
    if (expected > BigInt(Number.MAX_SAFE_INTEGER)) fail('VALIDATION');
    const payment: Payment = {
      id: nextId(tx.db, 'pay'),
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      method: 'cash',
      amount: order.total,
      currency: 'VND',
      status: 'succeeded',
      intentId: null,
      shiftId: shift.id,
      confirmedBy: staff.id,
      tendered: input.tendered,
      excess: false,
      correlationId: order.correlationId,
      createdAt: tx.now,
      updatedAt: tx.now,
      evidence: [
        { at: tx.now, source: staff.id, note: 'Cash confirmed at counter' },
      ],
    };
    tx.db.payments.push(payment);
    tx.db.ledger.push({
      id: nextId(tx.db, 'led'),
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      type: 'payment',
      method: 'cash',
      amount: order.total,
      refId: payment.id,
      shiftId: shift.id,
      at: tx.now,
    });
    markOrderPaid(tx, order);
    audit(tx, staffActor(staff), 'payment.cash', payment.id, {
      tenantId: order.tenantId,
      branchId: order.branchId,
    });
    return {
      order: orderView(order),
      paymentId: payment.id,
      change: input.tendered - order.total,
    };
  });
}

/** Worker-only command. The HTTP allowlist never exposes this operation. */
export function processFulfilment(tx: Tx) {
  let count = 0;
  for (const event of tx.db.outbox.filter((e) => e.status === 'pending')) {
    event.attempts++;
    if (tx.db.faults.ticketPublishFailures > 0) {
      tx.db.faults.ticketPublishFailures--;
      event.lastError = 'publish_failed';
      continue;
    }
    const order = tx.db.orders.find(
      (o) => o.id === event.orderId && ['paid', 'completed'].includes(o.status),
    );
    if (!order) {
      event.lastError = 'order_not_paid';
      continue;
    }
    if (!tx.db.tickets.some((t) => t.orderId === order.id)) {
      const ticket: Ticket = {
        id: nextId(tx.db, 'tkt'),
        tenantId: order.tenantId,
        branchId: order.branchId,
        orderId: order.id,
        orderCode: order.code,
        destination: order.deliverTo?.seatLabel ?? 'Counter',
        lines: order.lines
          .filter((l) => l.kind === 'item')
          .map((l) => ({
            name: l.name,
            quantity: l.quantity,
            detail: [l.sizeName, ...(l.modifiers ?? []).map((m) => m.name)]
              .filter(Boolean)
              .join(', '),
            note: l.note ?? '',
            limited: l.limited ?? false,
            confirmed: !l.limited,
          })),
        status: 'queued',
        history: [{ status: 'queued', at: tx.now, by: 'system' }],
        cancelReason: null,
        createdAt: tx.now,
      };
      tx.db.tickets.push(ticket);
    }
    event.status = 'done';
    event.lastError = null;
    count++;
  }
  return { published: count };
}
export function listTickets(tx: Tx, value: z.infer<typeof branchSchema>) {
  const input = parse(branchSchema, value);
  requireStaff(tx, 'ticket.work', input.branchId);
  return tx.db.tickets.filter((t) => t.branchId === input.branchId);
}
export function confirmService(
  tx: Tx,
  value: z.infer<typeof confirmServiceSchema>,
) {
  const input = parse(confirmServiceSchema, value);
  const staff = staffOf(tx);
  const ticket = owned(tx.db.tickets, input.ticketId, staff.tenantId);
  requireStaff(tx, 'ticket.work', ticket.branchId);
  if (ticket.status !== 'queued') fail('TICKET_STATE');
  const line = must(ticket.lines[input.lineIndex]);
  if (!line.limited) fail('VALIDATION');
  line.confirmed = true;
  audit(tx, staffActor(staff), 'service.confirm', ticket.id, {
    tenantId: staff.tenantId,
    branchId: ticket.branchId,
    meta: { lineIndex: input.lineIndex },
  });
  return ticket;
}
export function advanceTicket(tx: Tx, value: z.infer<typeof ticketSchema>) {
  const input = parse(ticketSchema, value);
  const staff = staffOf(tx);
  const ticket = owned(tx.db.tickets, input.ticketId, staff.tenantId);
  requireStaff(
    tx,
    input.status === 'cancelled' ? 'ticket.cancel' : 'ticket.work',
    ticket.branchId,
  );
  if (ticket.status === input.status) return ticket;
  if (ticket.status === 'served' || ticket.status === 'cancelled')
    fail('TICKET_STATE');
  if (input.status === 'cancelled') {
    if (!input.reason) fail('VALIDATION');
    ticket.cancelReason = input.reason;
  } else {
    const next = { queued: 'preparing', preparing: 'ready', ready: 'served' };
    if (
      next[ticket.status] !== input.status ||
      ticket.lines.some((l) => l.limited && !l.confirmed)
    )
      fail('TICKET_STATE');
  }
  ticket.status = input.status;
  ticket.history.push({ status: input.status, at: tx.now, by: staff.id });
  if (input.status === 'served') {
    const order = must(tx.db.orders.find((o) => o.id === ticket.orderId));
    if (order.lines.every((l) => l.kind === 'item')) {
      order.status = 'completed';
      order.completedAt = tx.now;
      order.history.push({ status: 'completed', at: tx.now });
    }
  }
  audit(tx, staffActor(staff), 'ticket.status', ticket.id, {
    tenantId: staff.tenantId,
    branchId: ticket.branchId,
    meta: { status: input.status },
  });
  return ticket;
}
