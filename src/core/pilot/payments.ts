import { z } from 'zod';
import { branchById, requireStaff, staffOf } from './access';
import { newSessionToken } from './credentials';
import { fail, must } from './errors';
import {
  authorizeOrder,
  getOrder,
  idempotent,
  markOrderPaid,
  orderIdSchema,
  parse,
  paymentView,
} from './orders';
import type { Payment, Tx } from './types';
import { nextId } from './util';
import { finishPromotion } from './promotions';

export const onlinePaymentSchema = orderIdSchema.extend({
  idempotencyKey: z
    .string()
    .min(8)
    .max(100)
    .regex(/^[\w-]+$/),
});
export function startOnlinePayment(
  tx: Tx,
  value: z.infer<typeof onlinePaymentSchema>,
) {
  const input = parse(onlinePaymentSchema, value);
  const order = authorizeOrder(tx, input.orderId);
  const paymentId = idempotent(tx, `online:${order.id}`, input, () => {
    if (order.status !== 'awaiting_payment' || order.paymentDeadline <= tx.now)
      fail('ORDER_STATE');
    if (order.total < 1 || order.total > 9_999_999_999) fail('VALIDATION');
    if (
      tx.db.payments.some(
        (p) =>
          p.orderId === order.id && ['initiated', 'pending'].includes(p.status),
      )
    )
      fail('PAYMENT_PENDING');
    let shiftId: string | null = null;
    if (tx.auth.staffToken) {
      const staff = requireStaff(tx, 'cash.confirm', order.branchId);
      shiftId = must(
        tx.db.shifts.find(
          (s) =>
            s.branchId === order.branchId &&
            s.cashierId === staff.id &&
            s.status === 'open',
        ),
        'NO_OPEN_SHIFT',
      ).id;
    }
    const payment: Payment = {
      id: nextId(tx.db, 'pay'),
      tenantId: order.tenantId,
      branchId: order.branchId,
      orderId: order.id,
      method: 'online',
      amount: order.total,
      currency: 'VND',
      status: 'pending',
      intentId: newSessionToken(tx).slice(0, 32),
      shiftId,
      confirmedBy: null,
      tendered: null,
      excess: false,
      correlationId: order.correlationId,
      createdAt: tx.now,
      updatedAt: tx.now,
      evidence: [],
      gateway: {
        provider: 'vnpay',
        expiresAt: order.paymentDeadline,
        lastQueryAt: null,
        transactionId: null,
      },
    };
    tx.db.payments.push(payment);
    return payment.id;
  });
  return {
    payment: paymentView(must(tx.db.payments.find((p) => p.id === paymentId))),
    checkoutUrl: null as string | null,
  };
}
export const recheckPayment = getOrder;
export function resumeOnlinePayment(
  tx: Tx,
  value: z.infer<typeof orderIdSchema>,
) {
  const input = parse(orderIdSchema, value);
  const order = authorizeOrder(tx, input.orderId);
  const payment = must(
    tx.db.payments.find(
      (p) => p.orderId === order.id && p.gateway && p.status === 'pending',
    ),
    'ORDER_STATE',
  );
  if (
    order.status !== 'awaiting_payment' ||
    payment.gateway!.expiresAt <= tx.now
  )
    fail('PAYMENT_PENDING');
  return { payment: paymentView(payment), checkoutUrl: null as string | null };
}

/** Trusted worker/server commands below are never in an HTTP command allowlist. */
export function paymentContext(tx: Tx, input: { paymentId: string }) {
  const payment = must(
    tx.db.payments.find((p) => p.id === input.paymentId && p.gateway),
  );
  return { payment, slug: branchById(tx.db, payment.branchId).slug };
}
export function pendingOnlinePayments(
  tx: Tx,
  input: { tenantId: string; orderId?: string },
) {
  return tx.db.payments
    .filter(
      (p) =>
        p.tenantId === input.tenantId &&
        p.gateway &&
        (!input.orderId || p.orderId === input.orderId) &&
        ['initiated', 'pending'].includes(p.status),
    )
    .sort(
      (a, b) => (a.gateway?.lastQueryAt ?? 0) - (b.gateway?.lastQueryAt ?? 0),
    )
    .slice(0, 10);
}
export function claimPaymentQuery(tx: Tx, input: { paymentId: string }) {
  const payment = must(
    tx.db.payments.find((p) => p.id === input.paymentId && p.gateway),
  );
  const gateway = payment.gateway!;
  if (
    payment.status !== 'pending' ||
    (gateway.lastQueryAt !== null && gateway.lastQueryAt > tx.now - 30_000)
  )
    return false;
  gateway.lastQueryAt = tx.now;
  return true;
}
export interface PaymentEvidence {
  tenantId: string;
  reference: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'expired' | 'pending';
  source: 'vnpay.ipn' | 'vnpay.query';
}
export function applyPaymentEvidence(tx: Tx, evidence: PaymentEvidence) {
  const payment = must(
    tx.db.payments.find(
      (p) =>
        p.tenantId === evidence.tenantId &&
        p.intentId === evidence.reference &&
        p.gateway,
    ),
  );
  if (
    evidence.currency !== payment.currency ||
    evidence.amount !== payment.amount ||
    !Number.isSafeInteger(evidence.amount)
  )
    fail('PAYMENT_REJECTED');
  if (evidence.status === 'succeeded' && !evidence.transactionId)
    fail('PAYMENT_REJECTED');
  if (
    evidence.status === 'succeeded' &&
    tx.db.payments.some(
      (p) =>
        p.id !== payment.id &&
        p.tenantId === payment.tenantId &&
        p.gateway?.transactionId === evidence.transactionId,
    )
  )
    fail('PAYMENT_REJECTED');
  if (payment.status === 'succeeded') {
    if (
      evidence.status === 'succeeded' &&
      payment.gateway!.transactionId !== evidence.transactionId
    )
      fail('PAYMENT_REJECTED');
    return { duplicate: true };
  }
  if (payment.status === evidence.status) return { duplicate: true };
  if (evidence.status === 'pending') return { duplicate: true };
  // A verified success may arrive after a failure or local deadline. Always record money.
  const order = must(tx.db.orders.find((o) => o.id === payment.orderId));
  payment.status = evidence.status;
  payment.updatedAt = tx.now;
  payment.evidence.push({
    at: tx.now,
    source: evidence.source,
    note: evidence.status,
  });
  if (evidence.status !== 'succeeded') return { duplicate: false };
  payment.gateway!.transactionId = evidence.transactionId;
  tx.db.ledger.push({
    id: nextId(tx.db, 'led'),
    tenantId: payment.tenantId,
    branchId: payment.branchId,
    orderId: order.id,
    type: 'payment',
    method: 'online',
    amount: payment.amount,
    refId: payment.id,
    shiftId: payment.shiftId,
    at: tx.now,
  });
  if (order.status === 'awaiting_payment') {
    markOrderPaid(tx, order);
  } else {
    payment.excess = true;
    const source =
      order.status === 'cancelled' ? 'late_payment' : 'excess_payment';
    order.notices.push(source);
    tx.db.refunds.push({
      id: nextId(tx.db, 'ref'),
      tenantId: payment.tenantId,
      branchId: payment.branchId,
      orderId: order.id,
      source,
      reason: source,
      status: 'requested',
      amount: 0,
      lines: [],
      requestedBy: { kind: 'system', id: 'payment' },
      approvedBy: null,
      method: null,
      evidence: null,
      confirmedBy: null,
      paymentId: payment.id,
      providerRefundId: null,
      shiftId: null,
      createdAt: tx.now,
      updatedAt: tx.now,
    });
    tx.db.exceptions.push({
      id: nextId(tx.db, 'exc'),
      tenantId: payment.tenantId,
      branchId: payment.branchId,
      kind: source,
      orderId: order.id,
      paymentId: payment.id,
      evidence: evidence.source,
      status: 'open',
      resolvedBy: null,
      resolution: null,
      createdAt: tx.now,
    });
  }
  return { duplicate: false };
}
export function expireUnpaidOrders(tx: Tx) {
  let expired = 0;
  for (const order of tx.db.orders) {
    if (
      order.status !== 'awaiting_payment' ||
      order.paymentDeadline > tx.now ||
      tx.db.payments.some(
        (p) =>
          p.orderId === order.id && ['initiated', 'pending'].includes(p.status),
      )
    )
      continue;
    order.status = 'cancelled';
    finishPromotion(tx, order.promotion, false);
    order.cancelReason = 'payment_deadline';
    order.history.push({ status: 'cancelled', at: tx.now });
    expired++;
  }
  return { expired };
}
export function listPaymentExceptions(tx: Tx, input: { branchId: string }) {
  const staff = staffOf(tx);
  requireStaff(tx, 'shift.use', input.branchId);
  if (!['owner', 'manager'].includes(staff.role)) fail('FORBIDDEN');
  return tx.db.exceptions
    .filter((e) => e.branchId === input.branchId && e.status === 'open')
    .map((e) => ({
      ...e,
      amount: tx.db.payments.find((p) => p.id === e.paymentId)?.amount ?? 0,
    }));
}
