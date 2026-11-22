import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { PilotError } from '../src/core/pilot/errors';
import type { PaymentEvidence } from '../src/core/pilot/payments';
import type { Payment } from '../src/core/pilot/types';

export interface PaymentGateway {
  tenantId: string;
  checkout(payment: Payment, slug: string, ip: string): string;
  verifyIpn(params: URLSearchParams): PaymentEvidence;
  query(payment: Payment): Promise<PaymentEvidence | null>;
}
export interface VnpayConfig {
  tenantId: string;
  tmnCode: string;
  hashSecret: string;
  publicOrigin: string;
  serverIp: string;
  mode: 'sandbox' | 'production';
}
const encode = (s: string) =>
  encodeURIComponent(s)
    .replace(
      /[!'()*~]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/%20/g, '+');
function canonical(values: Record<string, string>) {
  return Object.keys(values)
    .filter((key) => values[key] !== '')
    .sort()
    .map((key) => `${encode(key)}=${encode(values[key]!)}`)
    .join('&');
}
/** VNPAY timestamps are always GMT+7, regardless of the server's timezone. */
export function vnpayDate(ms: number) {
  return new Date(ms + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace(/\D/g, '');
}
function strings(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PilotError('PAYMENT_REJECTED');
  const result: Record<string, string> = {};
  for (const [key, v] of Object.entries(value)) {
    if (
      typeof v !== 'string' &&
      !(typeof v === 'number' && Number.isSafeInteger(v))
    )
      throw new PilotError('PAYMENT_REJECTED');
    result[key] = String(v);
  }
  return result;
}
const queryResponseFields = [
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

/** Server-only adapter. No network call occurs when creating a signed checkout URL. */
export function createVnpayGateway(
  config: VnpayConfig,
  transport: typeof fetch = fetch,
  clock = Date.now,
): PaymentGateway {
  const origin = new URL(config.publicOrigin);
  if (
    !config.tenantId ||
    !/^[a-zA-Z0-9]{1,32}$/.test(config.tmnCode) ||
    config.hashSecret.length < 16 ||
    !isIP(config.serverIp) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== '/' ||
    (origin.protocol !== 'https:' &&
      !(
        config.mode === 'sandbox' &&
        origin.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(origin.hostname)
      ))
  )
    throw new Error('Invalid server VNPAY configuration.');
  const host =
    config.mode === 'production'
      ? 'https://pay.vnpay.vn'
      : 'https://sandbox.vnpayment.vn';
  const sign = (data: string) =>
    createHmac('sha512', config.hashSecret).update(data).digest('hex');
  function verify(data: string, signature: string | undefined) {
    if (
      !signature ||
      !/^[a-f0-9]{128}$/i.test(signature) ||
      !timingSafeEqual(
        Buffer.from(sign(data), 'hex'),
        Buffer.from(signature, 'hex'),
      )
    )
      throw new PilotError('PAYMENT_REJECTED');
  }
  function evidence(
    data: Record<string, string>,
    source: PaymentEvidence['source'],
  ): PaymentEvidence {
    if (
      data.vnp_TmnCode !== config.tmnCode ||
      !/^[a-zA-Z0-9]{1,100}$/.test(data.vnp_TxnRef ?? '') ||
      !/^\d{1,12}$/.test(data.vnp_Amount ?? '') ||
      Number(data.vnp_Amount) % 100 !== 0 ||
      (data.vnp_CurrCode !== undefined && data.vnp_CurrCode !== 'VND')
    )
      throw new PilotError('PAYMENT_REJECTED');
    const status = data.vnp_TransactionStatus;
    // Suspicious/reversed/unknown states remain pending; never invite another payment.
    const success = data.vnp_ResponseCode === '00' && status === '00';
    if (success && !/^[1-9]\d{0,14}$/.test(data.vnp_TransactionNo ?? ''))
      throw new PilotError('PAYMENT_REJECTED');
    return {
      tenantId: config.tenantId,
      reference: data.vnp_TxnRef!,
      transactionId: data.vnp_TransactionNo ?? '',
      amount: Number(data.vnp_Amount) / 100,
      currency: 'VND',
      source,
      status: success
        ? 'succeeded'
        : status === '02'
          ? data.vnp_ResponseCode === '11'
            ? 'expired'
            : 'failed'
          : 'pending',
    };
  }
  return {
    tenantId: config.tenantId,
    checkout(payment, slug, ip) {
      if (
        payment.tenantId !== config.tenantId ||
        !payment.intentId ||
        !payment.gateway ||
        !/^[a-z0-9-]{3,80}$/.test(slug) ||
        !Number.isSafeInteger(payment.amount * 100)
      )
        throw new PilotError('PAYMENT_REJECTED');
      const values = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: config.tmnCode,
        vnp_Amount: String(payment.amount * 100),
        vnp_CurrCode: 'VND',
        vnp_TxnRef: payment.intentId,
        vnp_OrderInfo: `BrewSpace ${payment.intentId}`,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: `${origin.origin}/v/${slug}`,
        vnp_IpAddr: isIP(ip) ? ip : config.serverIp,
        vnp_CreateDate: vnpayDate(payment.createdAt),
        vnp_ExpireDate: vnpayDate(payment.gateway.expiresAt),
      };
      const data = canonical(values);
      return `${host}/paymentv2/vpcpay.html?${data}&vnp_SecureHash=${sign(data)}`;
    },
    verifyIpn(params) {
      const values: Record<string, string> = {};
      for (const [key, value] of params) {
        if (
          !key.startsWith('vnp_') ||
          Object.hasOwn(values, key) ||
          value.length > 1000
        )
          throw new PilotError('PAYMENT_REJECTED');
        values[key] = value;
      }
      const signature = values.vnp_SecureHash;
      delete values.vnp_SecureHash;
      delete values.vnp_SecureHashType;
      verify(canonical(values), signature);
      return evidence(values, 'vnpay.ipn');
    },
    async query(payment) {
      if (payment.tenantId !== config.tenantId || !payment.intentId)
        throw new PilotError('PAYMENT_REJECTED');
      const values = {
        vnp_RequestId: randomUUID().replace(/-/g, ''),
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: config.tmnCode,
        vnp_TxnRef: payment.intentId,
        vnp_TransactionDate: vnpayDate(payment.createdAt),
        vnp_CreateDate: vnpayDate(clock()),
        vnp_IpAddr: config.serverIp,
        vnp_OrderInfo: `Query ${payment.intentId}`,
      };
      const response = await transport(
        `${host}/merchant_webapi/api/transaction`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          redirect: 'error',
          body: JSON.stringify({
            ...values,
            vnp_SecureHash: sign(Object.values(values).join('|')),
          }),
        },
      );
      if (!response.ok) throw new PilotError('PROVIDER_UNAVAILABLE');
      const data = strings(await response.json());
      verify(
        queryResponseFields.map((field) => data[field] ?? '').join('|'),
        data.vnp_SecureHash,
      );
      if (
        data.vnp_Command !== 'querydr' ||
        data.vnp_TmnCode !== config.tmnCode ||
        data.vnp_TxnRef !== payment.intentId
      )
        throw new PilotError('PAYMENT_REJECTED');
      if (data.vnp_ResponseCode !== '00') return null;
      if (data.vnp_TransactionType !== '01')
        throw new PilotError('PAYMENT_REJECTED');
      return evidence(data, 'vnpay.query');
    },
  };
}
