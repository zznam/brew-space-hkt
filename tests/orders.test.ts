import { describe, expect, it } from 'vitest';
import { calculateQuoteTotal } from '../src/core/billing';
import { createPilotEngine, type Reply } from '../src/core/pilot/engine';
import { createPilotWorld } from '../src/core/pilot/fixtures';
import { DAY, MIN } from '../src/core/pilot/util';

function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(JSON.stringify(reply.error));
  return reply.data;
}
function setup() {
  let now = Date.UTC(2026, 10, 16, 3);
  const world = createPilotWorld(now);
  const engine = createPilotEngine(world, {}, () => now);
  const tenant = world.db.tenants[0]!;
  const branchId = world.db.branches[0]!.id;
  const signIn = (role: string, tenantId = tenant.id) => ({
    staffToken: data(
      engine.execute('staffSignIn', {
        email: `${role}@${tenantId}.demo.test`,
        password: 'demo-password',
      }),
    ).token,
  });
  const owner = signIn('owner');
  const cashier = signIn('cashier');
  const server = signIn('server');
  const item = world.db.items[0]!;
  const quote = (limited = false) => {
    if (limited)
      data(
        engine.execute(
          'saveItem',
          { ...item, limited: true, kind: 'service' },
          owner,
        ),
      );
    return data(
      engine.execute(
        'createQuote',
        { branchId, lines: [{ itemId: item.id, quantity: 2, note: 'No ice' }] },
        { clientId: 'test-device' },
      ),
    );
  };
  const order = (limited = false) => {
    const q = quote(limited);
    const auth = { accessTokens: [q.quoteToken!] };
    return {
      q,
      auth,
      order: data(
        engine.execute(
          'createOrder',
          { quoteId: q.quote.id, idempotencyKey: 'create-key-1' },
          auth,
        ),
      ),
    };
  };
  const shift = () =>
    data(
      engine.execute(
        'openShift',
        { branchId, openingFloat: 100000, idempotencyKey: 'shift-key-1' },
        cashier,
      ),
    );
  return {
    engine,
    world,
    tenant,
    branchId,
    owner,
    cashier,
    server,
    item,
    quote,
    order,
    shift,
    signIn,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('server quote, cash order and fulfilment rules', () => {
  it('rounds each fee once with safe integer boundaries', () => {
    expect(
      calculateQuoteTotal(
        [{ kind: 'item', lineTotal: 115000 }],
        [
          {
            id: 'vat',
            name: 'Tax',
            kind: 'percent',
            value: 800,
            appliesTo: 'items',
          },
          {
            id: 'service',
            name: 'Service',
            kind: 'fixed',
            value: 5000,
            appliesTo: 'all',
          },
          {
            id: 'seat',
            name: 'Seat only',
            kind: 'fixed',
            value: 2000,
            appliesTo: 'seat',
          },
        ],
      ),
    ).toMatchObject({
      subtotal: 115000,
      total: 129200,
      fees: [{ amount: 9200 }, { amount: 5000 }],
    });
    expect(
      calculateQuoteTotal(
        [{ kind: 'item', lineTotal: 5 }],
        [
          {
            id: 'tax',
            name: 'Tax',
            kind: 'percent',
            value: 1000,
            appliesTo: 'all',
          },
        ],
      ).total,
    ).toBe(6);
    expect(() =>
      calculateQuoteTotal(
        [{ kind: 'item', lineTotal: Number.MAX_SAFE_INTEGER }],
        [{ id: 'fee', name: 'Fee', kind: 'fixed', value: 1, appliesTo: 'all' }],
      ),
    ).toThrow();
  });
  it('snapshots item size/modifiers and fees, keeps quoted prices, and refuses exactly expired quotes', () => {
    const s = setup();
    data(
      s.engine.execute(
        'configureFees',
        {
          fees: [
            {
              id: 'tax',
              name: 'Tax',
              kind: 'percent',
              value: 800,
              appliesTo: 'all',
            },
          ],
        },
        s.owner,
      ),
    );
    data(
      s.engine.execute(
        'saveItem',
        {
          ...s.item,
          sizes: [{ id: 'large', name: 'Large', price: 50000 }],
          modifierGroups: [
            {
              id: 'milk',
              name: 'Milk',
              options: [{ id: 'oat', name: 'Oat milk', priceDelta: 10000 }],
            },
          ],
        },
        s.owner,
      ),
    );
    const q = data(
      s.engine.execute('createQuote', {
        branchId: s.branchId,
        lines: [
          {
            itemId: s.item.id,
            quantity: 2,
            sizeId: 'large',
            modifiers: [{ groupId: 'milk', optionId: 'oat' }],
          },
        ],
      }),
    );
    expect(q.quote).toMatchObject({
      subtotal: 120000,
      total: 129600,
      fees: [{ amount: 9600 }],
      lines: [
        {
          unitPrice: 60000,
          sizeName: 'Large',
          modifiers: [{ name: 'Oat milk' }],
        },
      ],
    });
    data(
      s.engine.execute(
        'saveItem',
        { ...s.item, price: 99999, sizes: [] },
        s.owner,
      ),
    );
    const input = { quoteId: q.quote.id, idempotencyKey: 'price-key-1' };
    const auth = { accessTokens: [q.quoteToken!] };
    expect(data(s.engine.execute('createOrder', input, auth)).total).toBe(
      129600,
    );
    const expired = s.quote();
    s.advance(5 * MIN);
    expect(
      s.engine.execute(
        'createOrder',
        { quoteId: expired.quote.id, idempotencyKey: 'expired-key' },
        { accessTokens: [expired.quoteToken!] },
      ),
    ).toMatchObject({ ok: false, error: { code: 'QUOTE_EXPIRED' } });
    expect(data(s.engine.execute('createOrder', input, auth)).total).toBe(
      129600,
    );
  });
  it('protects quote/order ownership, disallows client prices, and rechecks sold-out items', () => {
    const s = setup();
    const q = s.quote();
    expect(
      s.engine.execute(
        'createOrder',
        { quoteId: q.quote.id, idempotencyKey: 'ownership-key' },
        { accessTokens: ['someone-else'] },
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(
      s.engine.execute('createQuote', {
        branchId: s.branchId,
        lines: [{ itemId: s.item.id, quantity: 1, unitPrice: 1 }],
      } as never),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    data(
      s.engine.execute(
        'setSoldOut',
        { itemId: s.item.id, soldOut: true },
        s.server,
      ),
    );
    expect(
      s.engine.execute(
        'createOrder',
        { quoteId: q.quote.id, idempotencyKey: 'soldout-key' },
        { accessTokens: [q.quoteToken!] },
      ),
    ).toMatchObject({ ok: false, error: { code: 'ITEM_UNAVAILABLE' } });
    expect(s.engine.snapshot().db.orders).toHaveLength(0);
    data(
      s.engine.execute(
        'setSoldOut',
        { itemId: s.item.id, soldOut: false },
        s.server,
      ),
    );
    const o = s.order();
    expect(
      s.engine.execute(
        'getOrder',
        { orderId: o.order.id },
        { accessTokens: [q.quoteToken!] },
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    s.advance(7 * DAY);
    expect(
      s.engine.execute(
        'createOrder',
        { quoteId: o.q.quote.id, idempotencyKey: 'create-key-1' },
        o.auth,
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(
      s.engine.execute('getOrder', { orderId: o.order.id }, o.auth),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
  it('takes cash once with an open own shift, records change/ledger and keeps the ticket retry durable', () => {
    const s = setup();
    const o = s.order();
    const shift = s.shift();
    const input = {
      orderId: o.order.id,
      shiftId: shift.id,
      tendered: 200000,
      idempotencyKey: 'cash-key-1',
    };
    expect(s.engine.execute('confirmCash', input, s.server)).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    expect(s.engine.execute('confirmCash', input, s.owner)).toMatchObject({
      ok: false,
      error: { code: 'NO_OPEN_SHIFT' },
    });
    expect(
      s.engine.execute('confirmCash', { ...input, tendered: 1 }, s.cashier),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    const paid = data(s.engine.execute('confirmCash', input, s.cashier));
    expect(paid.change).toBe(200000 - o.order.total);
    // F217: the staff order list carries what the receipt needs to be redisplayed.
    const listed = data(
      s.engine.execute('listOrders', { branchId: o.order.branchId }, s.cashier),
    ).find((row) => row.id === o.order.id);
    expect(listed?.paidWith).toEqual({
      method: 'cash',
      amount: o.order.total,
      tendered: 200000,
      change: 200000 - o.order.total,
    });
    expect(data(s.engine.execute('confirmCash', input, s.cashier))).toEqual(
      paid,
    );
    expect(
      s.engine.execute(
        'confirmCash',
        { ...input, tendered: 300000 },
        s.cashier,
      ),
    ).toMatchObject({ ok: false, error: { code: 'IDEMPOTENCY_CONFLICT' } });
    const snapshot = s.engine.snapshot();
    expect(snapshot.db.payments).toHaveLength(1);
    expect(snapshot.db.ledger).toHaveLength(1);
    expect(snapshot.db.tickets).toHaveLength(0);
    expect(snapshot.db.outbox[0]!.status).toBe('pending');
    snapshot.db.faults.ticketPublishFailures = 1;
    const restarted = createPilotEngine(snapshot);
    data(restarted.execute('processFulfilment', undefined));
    expect(restarted.snapshot().db.tickets).toHaveLength(0);
    data(restarted.execute('processFulfilment', undefined));
    data(restarted.execute('processFulfilment', undefined));
    expect(restarted.snapshot().db.tickets).toHaveLength(1);
    expect(restarted.snapshot().db.payments).toHaveLength(1);
    const closed = data(
      s.engine.execute(
        'closeShift',
        {
          shiftId: shift.id,
          countedCash: 100000 + o.order.total - 1000,
          idempotencyKey: 'close-key-1',
        },
        s.cashier,
      ),
    );
    expect(closed).toMatchObject({
      expectedCash: 100000 + o.order.total,
      variance: -1000,
    });
    expect(data(s.engine.execute('confirmCash', input, s.cashier))).toEqual(
      paid,
    );
  });
  it('requires service confirmation and sequential fulfilment; cancellation never changes money', () => {
    const s = setup();
    const o = s.order(true);
    const shift = s.shift();
    data(
      s.engine.execute(
        'confirmCash',
        {
          orderId: o.order.id,
          shiftId: shift.id,
          tendered: 200000,
          idempotencyKey: 'cash-key-2',
        },
        s.cashier,
      ),
    );
    data(s.engine.execute('processFulfilment', undefined));
    const ticketId = s.engine.snapshot().db.tickets[0]!.id;
    expect(
      s.engine.execute(
        'advanceTicket',
        { ticketId, status: 'preparing' },
        s.server,
      ),
    ).toMatchObject({ ok: false, error: { code: 'TICKET_STATE' } });
    data(
      s.engine.execute('confirmService', { ticketId, lineIndex: 0 }, s.server),
    );
    expect(
      s.engine.execute(
        'advanceTicket',
        { ticketId, status: 'served' },
        s.server,
      ),
    ).toMatchObject({ ok: false, error: { code: 'TICKET_STATE' } });
    data(
      s.engine.execute(
        'advanceTicket',
        { ticketId, status: 'preparing' },
        s.server,
      ),
    );
    data(
      s.engine.execute(
        'advanceTicket',
        { ticketId, status: 'ready' },
        s.server,
      ),
    );
    data(
      s.engine.execute(
        'advanceTicket',
        { ticketId, status: 'served' },
        s.server,
      ),
    );
    expect(
      data(s.engine.execute('getOrder', { orderId: o.order.id }, o.auth)).order
        .status,
    ).toBe('completed');
    expect(
      s.engine.execute(
        'cancelOrder',
        {
          orderId: o.order.id,
          reason: 'Changed mind',
          idempotencyKey: 'cancel-key-1',
        },
        o.auth,
      ),
    ).toMatchObject({ ok: false, error: { code: 'ORDER_STATE' } });
    const next = s.order();
    data(
      s.engine.execute(
        'confirmCash',
        {
          orderId: next.order.id,
          shiftId: shift.id,
          tendered: 200000,
          idempotencyKey: 'cash-key-3',
        },
        s.cashier,
      ),
    );
    data(s.engine.execute('processFulfilment', undefined));
    const nextTicket = s.engine.snapshot().db.tickets[1]!.id;
    data(
      s.engine.execute(
        'advanceTicket',
        { ticketId: nextTicket, status: 'cancelled', reason: 'Unavailable' },
        s.owner,
      ),
    );
    expect(
      data(s.engine.execute('getOrder', { orderId: next.order.id }, next.auth))
        .order,
    ).toMatchObject({ status: 'paid', refundedAmount: 0 });
    expect(s.engine.snapshot().db.refunds).toHaveLength(0);
  });
});
