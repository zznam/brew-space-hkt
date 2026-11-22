import { useEffect } from 'react';
import { Banner } from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { ErrorNotice } from '@/features/access/shared';
import { purchaseMessages } from './messages';

export function PurchaseError({ code }: { code: string | null }) {
  const { t } = useT(purchaseMessages);
  const key = code
    ? (
        {
          QUOTE_EXPIRED: 'quoteExpired',
          ITEM_UNAVAILABLE: 'unavailable',
          ORDER_STATE: 'orderState',
          NO_OPEN_SHIFT: 'noShift',
          PAYMENT_PENDING: 'pending',
          TICKET_STATE: 'ticketState',
          IDEMPOTENCY_CONFLICT: 'conflict',
          PROVIDER_UNAVAILABLE: 'providerUnavailable',
          PROMOTION_ENDED: 'offerEnded',
          VOUCHER_EXPIRED: 'offerEnded',
          VOUCHER_EXHAUSTED: 'offerEnded',
          VOUCHER_UNKNOWN: 'voucherUnknown',
          PROMOTION_CONFLICT: 'oneOffer',
        } as const
      )[code as 'QUOTE_EXPIRED']
    : undefined;
  return key ? (
    <Banner tone="danger" role="alert">
      {t(key)}
    </Banner>
  ) : (
    <ErrorNotice code={code} />
  );
}
export function useRefresh(refresh: () => void) {
  useEffect(() => {
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
}
