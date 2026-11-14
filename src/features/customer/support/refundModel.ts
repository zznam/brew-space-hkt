import type { Lang } from '../../../i18n/i18n';
import {
  MAX_NOTE_LENGTH,
  supportText,
  type SupportErrorCode,
} from './supportModel';

/* Pure refund-request domain (F126/F127). A request only asks a manager to
 * review a visit; it never moves money. There is deliberately no "refunded"
 * status: a refund may only be shown as done once the money is confirmed
 * returned, and this demo has no payments at all. */

export const MAX_REFUND_REASON = MAX_NOTE_LENGTH;

export type RefundStatus = 'requested' | 'withdrawn';

export interface RefundRequest {
  id: string;
  sessionId: string;
  venueId: string;
  seatId: string;
  /** Visit total in integer VND at the time of the request. */
  amount: number;
  reason: string;
  status: RefundStatus;
  /** Linked support item (category payment, always escalated to staff). */
  supportRequestId: string;
}

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  requested: 'Requested - waiting for manager review',
  withdrawn: 'Withdrawn by you',
};

export const REFUND_NOTICE =
  'A refund is only confirmed once the money has been returned to you. This demo moves no money, so nothing is paid back and nothing changes until a manager decides.';

export const refundStatusLabel = (
  status: RefundStatus,
  lang: Lang = 'en',
): string => supportText(`refundStatus.${status}`, lang);

export const refundNotice = (lang: Lang = 'en'): string =>
  supportText('refundNotice', lang);

export type ReasonValidation =
  | { ok: true; text: string }
  | { ok: false; message: string; code: SupportErrorCode };

export function validateRefundReason(text: unknown): ReasonValidation {
  if (typeof text !== 'string' || !text.trim())
    return {
      ok: false,
      message: 'Tell us why you are asking for a refund.',
      code: 'REFUND_REASON_EMPTY',
    };
  const trimmed = text.trim();
  if (trimmed.length > MAX_REFUND_REASON)
    return {
      ok: false,
      message: `The reason can be at most ${MAX_REFUND_REASON} characters.`,
      code: 'REFUND_REASON_TOO_LONG',
    };
  return { ok: true, text: trimmed };
}

/** The request still waiting for review for this session, if any. */
export function openRefundForSession(
  refunds: readonly RefundRequest[],
  sessionId: string,
): RefundRequest | undefined {
  return refunds.find(
    (entry) => entry.sessionId === sessionId && entry.status === 'requested',
  );
}

/** Newest request (open or withdrawn) for this session, for display. */
export function latestRefundForSession(
  refunds: readonly RefundRequest[],
  sessionId: string,
): RefundRequest | undefined {
  return refunds.filter((entry) => entry.sessionId === sessionId).at(-1);
}
