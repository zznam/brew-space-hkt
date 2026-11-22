import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import {
  createVnpayGateway,
  vnpayDate,
  type VnpayConfig,
} from '../server/vnpay';
import { createPayments } from '../server/payments';
import { createApiServer } from '../server/http';
import { openDatabase } from '../server/database';
import { createPilotWorld } from '../src/core/pilot/fixtures';
import { createPilotEngine, type Reply } from '../src/core/pilot/engine';
import type { Payment } from '../src/core/pilot/types';

const config: VnpayConfig = {
  tenantId: 'tenant-test',
  tmnCode: 'TESTONLY',
  hashSecret: 'test-only-secret-never-for-production',
  publicOrigin: 'http://127.0.0.1:8081',
  serverIp: '127.0.0.1',
  mode: 'sandbox',
};
const now = Date.UTC(2026, 10, 16, 5, 12, 13);
function data<T>(r: Reply<T>): T {
  if (!r.ok) throw new Error(r.error.code);
  return r.data;
}
const sign = (data: string) =>
  createHmac('sha512', config.hashSecret).update(data).digest('hex');
function ipn(payment: Payment, patch: Record<string, string> = {}) {
  const params = new URLSearchParams({
    vnp_TmnCode: config.tmnCode,
    vnp_TxnRef: payment.intentId!,
    vnp_Amount: String(payment.amount * 100),
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TransactionNo: '123456789',
    vnp_OrderInfo: 'BrewSpace payment',
    ...patch,
  });
  params.sort();
  params.set('vnp_SecureHash', sign(params.toString()));
  return params;
}
function samplePayment(): Payment {
  const world = createPilotWorld(now);
  const engine = createPilotEngine(world, {}, () => now);
  const q = data(
    engine.execute('createQuote', {
      branchId: world.db.branches[0]!.id,
      lines: [{ itemId: world.db.items[0]!.id, quantity: 1 }],
    }),
  );
  const auth = { accessTokens: [q.quoteToken!] };
  const order = data(
    engine.execute(
      'createOrder',
      { quoteId: q.quote.id, idempotencyKey: 'sample-order' },
      auth,
    ),
  );
  const started = data(
    engine.execute(
      'startOnlinePayment',
      { orderId: order.id, idempotencyKey: 'sample-payment' },
      auth,
    ),
  );
  return {
    ...data(engine.execute('paymentContext', { paymentId: started.payment.id }))
      .payment,
    tenantId: config.tenantId,
  };
}
const responseFields = [
  'vnp_ResponseId',
  'vnp_Command',
  'vnp_ResponseCode',
  'vnp_Message',
  'vnp_TmnCode',
  'vnp_TxnRef',
  'vnp_Amount',
  'vnp_BankCode',
  'vnp_PayDate',
  'vnp_TransactionNo',
  'vnp_TransactionType',
  'vnp_TransactionStatus',
  'vnp_OrderInfo',
  'vnp_PromotionCode',
  'vnp_PromotionAmount',
];
function queryResponse(
  payment: Payment,
  patch: Record<string, string> = {},
): Record<string, string> {
  const values: Record<string, string> = {
    vnp_ResponseId: 'response-test',
    vnp_Command: 'querydr',
    vnp_ResponseCode: '00',
    vnp_Message: 'Query Success',
    vnp_TmnCode: config.tmnCode,
    vnp_TxnRef: payment.intentId!,
    vnp_Amount: String(payment.amount * 100),
    vnp_BankCode: 'NCB',
    vnp_PayDate: '20261116121213',
    vnp_TransactionNo: '123456789',
    vnp_TransactionType: '01',
    vnp_TransactionStatus: '00',
    vnp_OrderInfo: 'Test payment',
    ...patch,
  };
  return {
    ...values,
    vnp_SecureHash: sign(responseFields.map((f) => values[f] ?? '').join('|')),
  };
}
describe('VNPAY server adapter', () => {
  it('signs a fixed VND amount, expiry and trusted return origin in Vietnam time', () => {
    const p = samplePayment();
    const gateway = createVnpayGateway(config);
    const url = new URL(gateway.checkout(p, 'cafe-test', '127.0.0.1'));
    expect(url.origin).toBe('https://sandbox.vnpayment.vn');
    expect(url.searchParams.get('vnp_ReturnUrl')).toBe(
      'http://127.0.0.1:8081/v/cafe-test',
    );
    expect(url.searchParams.get('vnp_Amount')).toBe(String(p.amount * 100));
    expect(url.searchParams.get('vnp_CreateDate')).toBe('20261116121213');
    expect(vnpayDate(Date.UTC(2026, 11, 31, 20))).toBe('20270101030000');
    const signature = url.searchParams.get('vnp_SecureHash');
    url.searchParams.delete('vnp_SecureHash');
    expect(signature).toBe(sign(url.searchParams.toString()));
    expect(() =>
      createVnpayGateway({
        ...config,
        publicOrigin: 'http://public.example',
        mode: 'production',
      }),
    ).toThrow();
    expect(() =>
      gateway.checkout({ ...p, tenantId: 'another' }, 'cafe-test', '127.0.0.1'),
    ).toThrow();
  });
  it('refuses altered signatures, duplicate fields, wrong merchant/currency and fractional VND', () => {
    const gateway = createVnpayGateway(config);
    const p = samplePayment();
    expect(gateway.verifyIpn(ipn(p))).toMatchObject({
      status: 'succeeded',
      amount: p.amount,
    });
    const altered = ipn(p);
    altered.set('vnp_Amount', '100');
    expect(() => gateway.verifyIpn(altered)).toThrow();
    const repeated = ipn(p);
    repeated.append('vnp_Amount', String(p.amount * 100));
    expect(() => gateway.verifyIpn(repeated)).toThrow();
    for (const patch of [
      { vnp_TmnCode: 'OTHER' },
      { vnp_CurrCode: 'USD' },
      { vnp_Amount: '12345' },
      { vnp_TransactionNo: '0' },
    ] as Record<string, string>[])
      expect(() => gateway.verifyIpn(ipn(p, patch))).toThrow();
    expect(
      gateway.verifyIpn(
        ipn(p, { vnp_ResponseCode: '07', vnp_TransactionStatus: '07' }),
      ).status,
    ).toBe('pending');
    expect(
      gateway.verifyIpn(
        ipn(p, { vnp_ResponseCode: '11', vnp_TransactionStatus: '02' }),
      ).status,
    ).toBe('expired');
  });
  it('authenticates status queries and rejects forged or unrelated results', async () => {
    const p = samplePayment();
    let response = queryResponse(p);
    const transport = vi.fn(
      async (_url: string | URL | Request, options?: RequestInit) => {
        const body = JSON.parse(String(options?.body));
        const sequence = [
          'vnp_RequestId',
          'vnp_Version',
          'vnp_Command',
          'vnp_TmnCode',
          'vnp_TxnRef',
          'vnp_TransactionDate',
          'vnp_CreateDate',
          'vnp_IpAddr',
          'vnp_OrderInfo',
        ];
        expect(body.vnp_SecureHash).toBe(
          sign(sequence.map((k) => body[k]).join('|')),
        );
        expect(body.vnp_TransactionDate).toBe('20261116121213');
        return Response.json(response);
      },
    );
    const gateway = createVnpayGateway(config, transport, () => now);
    expect(await gateway.query(p)).toMatchObject({
      status: 'succeeded',
      source: 'vnpay.query',
    });
    response = { ...queryResponse(p), vnp_Amount: '100' };
    await expect(gateway.query(p)).rejects.toThrow();
    response = queryResponse(p, { vnp_TxnRef: 'another' });
    await expect(gateway.query(p)).rejects.toThrow();
    response = queryResponse(p, { vnp_ResponseCode: '91' });
    expect(await gateway.query(p)).toBeNull();
    response = queryResponse(p, { vnp_TransactionType: '02' });
    await expect(gateway.query(p)).rejects.toThrow();
  });
  it('serves signed callbacks, recovers a lost callback by query, and never trusts a browser return', async () => {
    const db = openDatabase(':memory:', () => now);
    db.bootstrap('admin@test.example', 'test-admin-password');
    const platformToken = data(
      db.execute('platformSignIn', {
        email: 'admin@test.example',
        password: 'test-admin-password',
      }),
    ).token;
    const tenant = data(
      db.execute(
        'createTenant',
        {
          name: 'Cafe',
          currency: 'VND',
          branch: {
            name: 'Cafe',
            slug: 'cafe-test',
            address: 'Test',
            timezone: 'Asia/Ho_Chi_Minh',
            hours: Array(7).fill(null),
          },
          owner: {
            name: 'Owner',
            email: 'owner@test.example',
            password: 'test-owner-password',
          },
        },
        { platformToken },
      ),
    );
    const owner = {
      staffToken: data(
        db.execute('staffSignIn', {
          email: 'owner@test.example',
          password: 'test-owner-password',
        }),
      ).token,
    };
    const cat = data(
      db.execute('saveCategory', { name: 'Coffee', sort: 0 }, owner),
    );
    const item = data(
      db.execute(
        'saveItem',
        {
          name: 'Latte',
          categoryId: cat.id,
          kind: 'food_drink',
          price: 45000,
          sizes: [],
          modifierGroups: [],
          limited: false,
        },
        owner,
      ),
    );
    let providerPayment: Payment | undefined;
    const gateway = createVnpayGateway(
      { ...config, tenantId: tenant.tenant.id },
      async () => Response.json(queryResponse(providerPayment!)),
      () => now,
    );
    const server = createApiServer(db, { gateway });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const command = async (name: string, input: unknown, token: string) => {
      const response = await fetch(`${base}/api/customer/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      return response.json();
    };
    try {
      const quote = data(
        db.execute('createQuote', {
          branchId: tenant.branch.id,
          lines: [{ itemId: item.id, quantity: 1 }],
        }),
      );
      const auth = { accessTokens: [quote.quoteToken!] };
      const order = data(
        db.execute(
          'createOrder',
          { quoteId: quote.quote.id, idempotencyKey: 'http-order-test' },
          auth,
        ),
      );
      const started = await command(
        'startOnlinePayment',
        { orderId: order.id, idempotencyKey: 'http-pay-test' },
        quote.quoteToken!,
      );
      expect(started.data.checkoutUrl).toContain(
        'https://sandbox.vnpayment.vn/',
      );
      providerPayment = data(
        db.execute('paymentContext', { paymentId: started.data.payment.id }),
      ).payment;
      // User-controlled return query parameters cannot change the database.
      await fetch(
        `${base}/v/cafe-test?vnp_ResponseCode=00&vnp_TransactionStatus=00`,
      );
      expect(
        data(db.execute('getOrder', { orderId: order.id }, auth)).order.status,
      ).toBe('awaiting_payment');
      expect(
        (await command('applyPaymentEvidence', {}, quote.quoteToken!)).ok,
      ).toBe(false);
      expect(
        (await command('recheckPayment', { orderId: order.id }, '0'.repeat(64)))
          .ok,
      ).toBe(false);
      const bad = ipn(providerPayment);
      bad.set('vnp_Amount', '100');
      expect(
        await (await fetch(`${base}/api/payments/vnpay/ipn?${bad}`)).json(),
      ).toMatchObject({ RspCode: '97' });
      const wrongAmount = ipn(providerPayment, { vnp_Amount: '100' });
      expect(
        await (
          await fetch(`${base}/api/payments/vnpay/ipn?${wrongAmount}`)
        ).json(),
      ).toMatchObject({ RspCode: '04' });
      const checked = await command(
        'recheckPayment',
        { orderId: order.id },
        quote.quoteToken!,
      );
      expect(checked.data.order.status).toBe('paid');
      expect(
        await (
          await fetch(`${base}/api/payments/vnpay/ipn?${ipn(providerPayment)}`)
        ).json(),
      ).toMatchObject({ RspCode: '02' });
      expect(
        (
          await command(
            'startOnlinePayment',
            { orderId: order.id, idempotencyKey: 'http-pay-test' },
            quote.quoteToken!,
          )
        ).data.checkoutUrl,
      ).toBeNull();
      expect(
        (await (await fetch(`${base}/api/venues/cafe-test`)).json()).data
          .onlinePaymentAvailable,
      ).toBe(true);
      const unavailable = createPayments(db);
      expect(() =>
        unavailable.start(
          { orderId: order.id, idempotencyKey: 'none-test' },
          auth,
          '127.0.0.1',
        ),
      ).toThrow('PROVIDER_UNAVAILABLE');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
    }
  });
});
