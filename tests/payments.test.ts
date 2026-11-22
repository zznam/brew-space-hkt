import { describe, expect, it } from 'vitest';
import { createPilotEngine, type Reply } from '../src/core/pilot/engine';
import { createPilotWorld } from '../src/core/pilot/fixtures';
import type { PaymentEvidence } from '../src/core/pilot/payments';
import { MIN } from '../src/core/pilot/util';

function data<T>(r: Reply<T>): T {
  if (!r.ok) throw new Error(r.error.code);
  return r.data;
}
function setup() {
  let now = Date.UTC(2026, 10, 16, 4);
  const world = createPilotWorld(now);
  let engine = createPilotEngine(world, {}, () => now);
  const branch = world.db.branches[0]!;
  const owner = {
    staffToken: data(
      engine.execute('staffSignIn', {
        email: `owner@${branch.tenantId}.demo.test`,
        password: 'demo-password',
      }),
    ).token,
  };
  const quote = data(
    engine.execute('createQuote', {
      branchId: branch.id,
      lines: [{ itemId: world.db.items[0]!.id, quantity: 1 }],
    }),
  );
  const auth = { accessTokens: [quote.quoteToken!] };
  const order = data(
    engine.execute(
      'createOrder',
      { quoteId: quote.quote.id, idempotencyKey: 'order-test' },
      auth,
    ),
  );
  const start = (idempotencyKey = 'payment-first') =>
    data(
      engine.execute(
        'startOnlinePayment',
        { orderId: order.id, idempotencyKey },
        auth,
      ),
    );
  const evidence = (
    paymentId: string,
    patch: Partial<PaymentEvidence> = {},
  ): PaymentEvidence => {
    const { payment } = data(engine.execute('paymentContext', { paymentId }));
    return {
      tenantId: branch.tenantId,
      reference: payment.intentId!,
      transactionId: '1234567',
      amount: order.total,
      currency: 'VND',
      status: 'succeeded',
      source: 'vnpay.ipn',
      ...patch,
    };
  };
  return {
    get engine() {
      return engine;
    },
    branch,
    owner,
    order,
    auth,
    start,
    evidence,
    advance: (ms: number) => {
      now += ms;
    },
    restart: () => {
      engine = createPilotEngine(engine.snapshot(), {}, () => now);
    },
  };
}
describe('authoritative online payment lifecycle', () => {
  it('limits in-flight attempts, protects ownership and resumes the same payment', () => {
    const s = setup();
    expect(
      s.engine.execute('startOnlinePayment', {
        orderId: s.order.id,
        idempotencyKey: 'attacker-key',
      }),
    ).toMatchObject({ ok: false });
    const first = s.start();
    expect(s.start()).toEqual(first);
    expect(
      s.engine.execute(
        'startOnlinePayment',
        { orderId: s.order.id, idempotencyKey: 'different-key' },
        s.auth,
      ),
    ).toMatchObject({ error: { code: 'PAYMENT_PENDING' } });
    expect(
      data(
        s.engine.execute(
          'resumeOnlinePayment',
          { orderId: s.order.id },
          s.auth,
        ),
      ).payment.id,
    ).toBe(first.payment.id);
    const shift = data(
      s.engine.execute(
        'openShift',
        {
          branchId: s.branch.id,
          openingFloat: 0,
          idempotencyKey: 'shift-test',
        },
        s.owner,
      ),
    );
    expect(
      s.engine.execute(
        'confirmCash',
        {
          orderId: s.order.id,
          shiftId: shift.id,
          tendered: s.order.total,
          idempotencyKey: 'cash-test',
        },
        s.owner,
      ),
    ).toMatchObject({ error: { code: 'PAYMENT_PENDING' } });
    expect(
      s.engine.execute(
        'cancelOrder',
        {
          orderId: s.order.id,
          reason: 'Changed mind',
          idempotencyKey: 'cancel-test',
        },
        s.auth,
      ),
    ).toMatchObject({ error: { code: 'PAYMENT_PENDING' } });
    s.advance(60 * MIN);
    data(s.engine.execute('expireUnpaidOrders', undefined));
    expect(
      data(s.engine.execute('getOrder', { orderId: s.order.id }, s.auth)).order
        .status,
    ).toBe('awaiting_payment');
    expect(
      s.engine.execute('resumeOnlinePayment', { orderId: s.order.id }, s.auth),
    ).toMatchObject({ error: { code: 'PAYMENT_PENDING' } });
  });
  it('rejects wrong currency, amount, tenant and reference without writing money', () => {
    const s = setup();
    const p = s.start();
    for (const patch of [
      { currency: 'USD' },
      { amount: s.order.total + 1 },
      { tenantId: 'foreign' },
      { reference: 'missing' },
    ]) {
      expect(
        s.engine.execute(
          'applyPaymentEvidence',
          s.evidence(p.payment.id, patch),
        ),
      ).toMatchObject({ ok: false });
    }
    expect(s.engine.snapshot().db.ledger).toHaveLength(0);
    expect(s.engine.snapshot().db.payments[0]!.status).toBe('pending');
  });
  it('settles once after restart, never downgrades success and retries fulfilment', () => {
    const s = setup();
    const p = s.start();
    s.restart();
    const success = s.evidence(p.payment.id);
    expect(data(s.engine.execute('applyPaymentEvidence', success))).toEqual({
      duplicate: false,
    });
    expect(data(s.engine.execute('applyPaymentEvidence', success))).toEqual({
      duplicate: true,
    });
    data(
      s.engine.execute('applyPaymentEvidence', {
        ...success,
        status: 'failed',
      }),
    );
    data(s.engine.execute('processFulfilment', undefined));
    data(s.engine.execute('processFulfilment', undefined));
    const db = s.engine.snapshot().db;
    expect(db.payments[0]!.status).toBe('succeeded');
    expect(db.orders[0]!.paidAmount).toBe(s.order.total);
    expect(db.ledger).toHaveLength(1);
    expect(db.tickets).toHaveLength(1);
    expect(db.outbox).toHaveLength(1);
    expect(
      s.engine.execute('applyPaymentEvidence', {
        ...success,
        transactionId: 'another',
      }),
    ).toMatchObject({ ok: false });
  });
  it('records two receipts and a refund exception when a failed attempt later succeeds', () => {
    const s = setup();
    const first = s.start();
    data(
      s.engine.execute(
        'applyPaymentEvidence',
        s.evidence(first.payment.id, { status: 'failed' }),
      ),
    );
    const second = s.start('payment-second');
    data(
      s.engine.execute(
        'applyPaymentEvidence',
        s.evidence(second.payment.id, { transactionId: '2222222' }),
      ),
    );
    data(
      s.engine.execute('applyPaymentEvidence', s.evidence(first.payment.id)),
    );
    data(
      s.engine.execute('applyPaymentEvidence', s.evidence(first.payment.id)),
    );
    const db = s.engine.snapshot().db;
    expect(db.ledger).toHaveLength(2);
    expect(db.outbox).toHaveLength(1);
    expect(db.orders[0]!.paidAmount).toBe(s.order.total);
    expect(db.refunds).toMatchObject([
      {
        source: 'excess_payment',
        status: 'requested',
        paymentId: first.payment.id,
      },
    ]);
    expect(
      data(
        s.engine.execute(
          'listPaymentExceptions',
          { branchId: s.branch.id },
          s.owner,
        ),
      ),
    ).toMatchObject([{ amount: s.order.total }]);
  });
  it('expires unpaid counter orders and records late money without fulfilling a cancelled order', () => {
    const s = setup();
    const p = s.start();
    data(
      s.engine.execute(
        'applyPaymentEvidence',
        s.evidence(p.payment.id, { status: 'expired' }),
      ),
    );
    s.advance(60 * MIN);
    data(s.engine.execute('expireUnpaidOrders', undefined));
    data(s.engine.execute('applyPaymentEvidence', s.evidence(p.payment.id)));
    const db = s.engine.snapshot().db;
    expect(db.orders[0]!.status).toBe('cancelled');
    expect(db.ledger).toHaveLength(1);
    expect(db.outbox).toHaveLength(0);
    expect(db.refunds[0]!.source).toBe('late_payment');
  });
  it('coordinates reconciliation leases and keeps unresolved payments on a closed shift', () => {
    const s = setup();
    const shift = data(
      s.engine.execute(
        'openShift',
        {
          branchId: s.branch.id,
          openingFloat: 100000,
          idempotencyKey: 'shift-test',
        },
        s.owner,
      ),
    );
    const p = data(
      s.engine.execute(
        'startOnlinePayment',
        { orderId: s.order.id, idempotencyKey: 'online-staff' },
        s.owner,
      ),
    );
    expect(
      data(s.engine.execute('claimPaymentQuery', { paymentId: p.payment.id })),
    ).toBe(true);
    s.restart();
    expect(
      data(s.engine.execute('claimPaymentQuery', { paymentId: p.payment.id })),
    ).toBe(false);
    s.advance(30_000);
    expect(
      data(s.engine.execute('claimPaymentQuery', { paymentId: p.payment.id })),
    ).toBe(true);
    const closed = data(
      s.engine.execute(
        'closeShift',
        {
          shiftId: shift.id,
          countedCash: 100000,
          idempotencyKey: 'close-test',
        },
        s.owner,
      ),
    );
    expect(closed.pendingPaymentIds).toEqual([p.payment.id]);
    expect(closed.variance).toBe(0);
    data(
      s.engine.execute(
        'applyPaymentEvidence',
        s.evidence(p.payment.id, { source: 'vnpay.query' }),
      ),
    );
    expect(s.engine.snapshot().db.ledger[0]!.shiftId).toBe(shift.id);
  });
});
