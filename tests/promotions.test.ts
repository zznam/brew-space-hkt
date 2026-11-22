import { describe, expect, it } from 'vitest';
import {
  calculatePromotionDiscount,
  calculateQuoteTotal,
} from '../src/core/billing';
import {
  createPilotEngine,
  type Input,
  type Reply,
} from '../src/core/pilot/engine';
import { createPilotWorld } from '../src/core/pilot/fixtures';
import { formatLocalInput, parseLocalInput } from '../src/core/pilot/dateInput';
import { HOUR, MIN } from '../src/core/pilot/util';

function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(reply.error.code);
  return reply.data;
}
function setup() {
  let now = Date.UTC(2026, 10, 16, 7);
  const world = createPilotWorld(now);
  const engine = createPilotEngine(world, {}, () => now);
  const branch = world.db.branches[0]!;
  const item = world.db.items[0]!;
  const login = (role: string) => ({
    staffToken: data(
      engine.execute('staffSignIn', {
        email: `${role}@${branch.tenantId}.demo.test`,
        password: 'demo-password',
      }),
    ).token,
  });
  const owner = login('owner'),
    cashier = login('cashier');
  const voucher = (patch: Partial<Input<'createVoucher'>> = {}) =>
    data(
      engine.execute(
        'createVoucher',
        {
          code: 'WELCOME',
          kind: 'percent',
          value: 10,
          cap: 1000,
          validFrom: now - MIN,
          validTo: now + HOUR,
          usageLimit: 1,
          ...patch,
        },
        owner,
      ),
    );
  const quote = (promotion?: Input<'createQuote'>['promotion']) =>
    data(
      engine.execute('createQuote', {
        branchId: branch.id,
        lines: [{ itemId: item.id, quantity: 1 }],
        promotion,
      }),
    );
  const create = (q: ReturnType<typeof quote>) =>
    engine.execute(
      'createOrder',
      { quoteId: q.quote.id, idempotencyKey: 'order-quote-key' },
      { accessTokens: [q.quoteToken!] },
    );
  return {
    engine,
    world,
    branch,
    item,
    owner,
    cashier,
    voucher,
    quote,
    create,
    get now() {
      return now;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}
describe('one capped promotion and transactional quotas', () => {
  it('caps discounts to eligible lines and the owner ceiling without floating point loss', () => {
    expect(
      calculatePromotionDiscount(
        [{ lineTotal: 999 }],
        { kind: 'percent', value: 10, cap: 1000 },
        30,
      ),
    ).toBe(99);
    expect(
      calculatePromotionDiscount(
        [{ lineTotal: 1000 }],
        { kind: 'fixed', value: 5000, cap: 1000 },
        30,
      ),
    ).toBe(300);
    const total = calculateQuoteTotal(
      [{ kind: 'item', lineTotal: 1000 }],
      [
        {
          id: 'fee',
          name: 'Service',
          kind: 'percent',
          value: 1000,
          appliesTo: 'items',
        },
      ],
      300,
    );
    expect(total).toMatchObject({
      subtotal: 1000,
      discount: 300,
      total: 800,
      fees: [{ amount: 100 }],
    });
    expect(() =>
      calculateQuoteTotal([{ kind: 'item', lineTotal: 1000 }], [], 1001),
    ).toThrow();
    expect(() =>
      calculatePromotionDiscount(
        [{ lineTotal: 1.5 }],
        { kind: 'fixed', value: 1, cap: 1 },
        30,
      ),
    ).toThrow();
  });
  it('reserves the final voucher use atomically, returns cancellation holds, and consumes once on payment', () => {
    const s = setup();
    s.voucher();
    const a = s.quote({ kind: 'voucher', code: 'welcome' });
    const b = s.quote({ kind: 'voucher', code: 'WELCOME' });
    expect(a.quote.discount).toBe(1000);
    const first = data(s.create(a));
    expect(s.create(b)).toMatchObject({ error: { code: 'VOUCHER_EXHAUSTED' } });
    data(
      s.engine.execute(
        'cancelOrder',
        {
          orderId: first.id,
          reason: 'Changed plans',
          idempotencyKey: 'cancel-key',
        },
        { accessTokens: [a.quoteToken!] },
      ),
    );
    const second = data(s.create(b));
    expect(data(s.create(b)).id).toBe(second.id);
    expect(s.engine.snapshot().db.vouchers[0]).toMatchObject({
      held: 1,
      used: 0,
    });
    const shift = data(
      s.engine.execute(
        'openShift',
        { branchId: s.branch.id, openingFloat: 0, idempotencyKey: 'shift-key' },
        s.owner,
      ),
    );
    const pay = {
      orderId: second.id,
      shiftId: shift.id,
      tendered: second.total,
      idempotencyKey: 'cash-pay-key',
    };
    data(s.engine.execute('confirmCash', pay, s.owner));
    data(s.engine.execute('confirmCash', pay, s.owner));
    expect(s.engine.snapshot().db.vouchers[0]).toMatchObject({
      held: 0,
      used: 1,
    });
    expect(() => s.quote({ kind: 'voucher', code: 'WELCOME' })).toThrow(
      'VOUCHER_EXHAUSTED',
    );
  });
  it('requires approval, applies item scope, audits decisions, and preserves already ordered prices after stopping', () => {
    const s = setup();
    const input: Input<'proposeSale'> = {
      branchId: s.branch.id,
      name: 'Quiet hours',
      appliesTo: 'items',
      tierIds: null,
      startAt: s.now - MIN,
      endAt: s.now + HOUR,
      discountPercent: 20,
      discountCap: 2000,
      quota: 2,
    };
    const sale = data(s.engine.execute('proposeSale', input, s.cashier));
    expect(() => s.quote({ kind: 'flash_sale', id: sale.id })).toThrow(
      'PROMOTION_ENDED',
    );
    expect(
      s.engine.execute(
        'approveSale',
        { saleId: sale.id, reason: 'Approve' },
        s.cashier,
      ),
    ).toMatchObject({ error: { code: 'FORBIDDEN' } });
    data(
      s.engine.execute(
        'approveSale',
        { saleId: sale.id, reason: 'Slow hours' },
        s.owner,
      ),
    );
    expect(
      data(s.engine.execute('publicVenue', { slug: s.branch.slug })).sales[0]!
        .id,
    ).toBe(sale.id);
    const q = s.quote({ kind: 'flash_sale', id: sale.id });
    const order = data(s.create(q));
    expect(q.quote.discount).toBe(2000);
    data(
      s.engine.execute(
        'stopSale',
        { saleId: sale.id, reason: 'Capacity reached' },
        s.owner,
      ),
    );
    expect(() => s.quote({ kind: 'flash_sale', id: sale.id })).toThrow(
      'PROMOTION_ENDED',
    );
    expect(
      data(
        s.engine.execute(
          'getOrder',
          { orderId: order.id },
          { accessTokens: [q.quoteToken!] },
        ),
      ).order.total,
    ).toBe(q.quote.total);
    expect(
      s.engine
        .snapshot()
        .db.audit.some(
          (a) => a.action === 'sale.approve' && a.meta.reason === 'Slow hours',
        ),
    ).toBe(true);
    expect(
      s.engine.execute(
        'proposeSale',
        { ...input, discountPercent: 31 },
        s.owner,
      ),
    ).toMatchObject({ error: { code: 'GUARDRAIL' } });
  });
  it('refuses stacking and foreign vouchers, and expires quote windows and unpaid quota holds', () => {
    const s = setup();
    s.voucher({ validTo: s.now + 10000 });
    const q = s.quote({ kind: 'voucher', code: 'WELCOME' });
    expect(q.quote.expiresAt).toBe(s.now + 10000);
    expect(
      s.engine.execute('createQuote', {
        branchId: s.branch.id,
        lines: [{ itemId: s.item.id, quantity: 1 }],
        promotion: [
          { kind: 'voucher', code: 'WELCOME' },
          { kind: 'flash_sale', id: 'sale' },
        ],
      } as never),
    ).toMatchObject({ error: { code: 'VALIDATION' } });
    const other = s.world.db.branches.find(
      (b) => b.tenantId !== s.branch.tenantId,
    )!;
    const otherItem = s.world.db.items.find(
      (i) => i.tenantId === other.tenantId,
    )!;
    expect(
      s.engine.execute('createQuote', {
        branchId: other.id,
        lines: [{ itemId: otherItem.id, quantity: 1 }],
        promotion: { kind: 'voucher', code: 'WELCOME' },
      }),
    ).toMatchObject({ error: { code: 'VOUCHER_UNKNOWN' } });
    s.advance(10000);
    expect(s.create(q)).toMatchObject({ error: { code: 'QUOTE_EXPIRED' } });
    s.voucher({ code: 'SECOND' });
    const second = s.quote({ kind: 'voucher', code: 'SECOND' });
    data(s.create(second));
    s.advance(11 * MIN);
    data(s.engine.execute('expireUnpaidOrders', undefined));
    data(s.engine.execute('expireUnpaidOrders', undefined));
    expect(
      s.engine.snapshot().db.vouchers.find((v) => v.code === 'SECOND'),
    ).toMatchObject({ held: 0, used: 0 });
  });
  it('parses Vietnam wall time strictly including leap days and year rollover', () => {
    expect(parseLocalInput('2026-02-30 12:00')).toBeNull();
    expect(parseLocalInput('2026-01-01 24:10')).toBeNull();
    expect(parseLocalInput('2028-02-29 00:00')).toBe(Date.UTC(2028, 1, 28, 17));
    expect(formatLocalInput(Date.UTC(2026, 11, 31, 20))).toBe(
      '2027-01-01 03:00',
    );
  });
});
