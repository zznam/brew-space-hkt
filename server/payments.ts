import type { AppDatabase } from './database';
import type { PaymentGateway } from './vnpay';
import type { Auth } from '../src/core/pilot/types';
import type { Input, Reply } from '../src/core/pilot/engine';
import { PilotError } from '../src/core/pilot/errors';

function unwrap<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new PilotError(reply.error.code);
  return reply.data;
}
export function createPayments(db: AppDatabase, gateway?: PaymentGateway) {
  async function reconcile(orderId?: string) {
    if (!gateway) return;
    const payments = unwrap(
      db.execute('pendingOnlinePayments', {
        tenantId: gateway.tenantId,
        orderId,
      }),
    );
    for (const payment of payments) {
      if (!unwrap(db.execute('claimPaymentQuery', { paymentId: payment.id })))
        continue;
      try {
        const evidence = await gateway.query(payment);
        if (evidence) unwrap(db.execute('applyPaymentEvidence', evidence));
      } catch {
        // Timeout, mismatch and unavailable provider all preserve the pending attempt.
        // No tokens, bank data, signed URL or raw provider response in logs.
        console.warn('Payment reconciliation remains pending.');
      }
    }
  }
  return {
    available: (tenantId: string) => gateway?.tenantId === tenantId,
    start(
      input: Input<'startOnlinePayment'> | Input<'resumeOnlinePayment'>,
      auth: Auth,
      ip: string,
    ) {
      const { order } = unwrap(
        db.execute('getOrder', { orderId: input.orderId }, auth),
      );
      if (!gateway || order.tenantId !== gateway.tenantId)
        throw new PilotError('PROVIDER_UNAVAILABLE');
      const result =
        'idempotencyKey' in input
          ? unwrap(db.execute('startOnlinePayment', input, auth))
          : unwrap(db.execute('resumeOnlinePayment', input, auth));
      const { payment, slug } = unwrap(
        db.execute('paymentContext', { paymentId: result.payment.id }),
      );
      return {
        ...result,
        checkoutUrl:
          payment.status === 'pending'
            ? gateway.checkout(payment, slug, ip)
            : null,
      };
    },
    async recheck(input: Input<'recheckPayment'>, auth: Auth) {
      unwrap(db.execute('getOrder', input, auth));
      await reconcile(input.orderId);
      return db.execute('getOrder', input, auth);
    },
    ipn(params: URLSearchParams) {
      if (!gateway) return { RspCode: '99', Message: 'Unavailable' };
      try {
        const evidence = gateway.verifyIpn(params);
        const result = db.execute('applyPaymentEvidence', evidence);
        if (!result.ok)
          return {
            RspCode: result.error.code === 'NOT_FOUND' ? '01' : '04',
            Message: 'Rejected',
          };
        return {
          RspCode: result.data.duplicate ? '02' : '00',
          Message: 'Confirmed',
        };
      } catch {
        return { RspCode: '97', Message: 'Invalid signature or data' };
      }
    },
    reconcile,
  };
}
