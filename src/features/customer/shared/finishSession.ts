import type { ActionResult, Session } from '@/core';
import { appStore } from '@/core/useAppStore';
import { cartStore } from '../cart/useCart';
import { recordCompletedVisit } from '../loyalty/useLoyalty';
import { supportStore } from '../support/useSupport';
import { buildVisitSnapshot } from './visit';

/** Ends the customer's demo session: snapshot first (core drops the session),
 * then hand the snapshot to the receipt and loyalty features. No payment. */
export function finishSession(session: Session): ActionResult {
  const snapshot = buildVisitSnapshot(session);
  const result = appStore.getState().endSession(session.id);
  if (!result.ok) return result;
  supportStore.getState().setLastReceipt(snapshot);
  cartStore.getState().forgetSession(session.id);
  void recordCompletedVisit(snapshot);
  return result;
}
