import type { Session } from './domain';

/** Demo policy: bundles discount seat time 15%; overtime has a 10 minute grace.
 * Once grace is exceeded, only minutes beyond grace are charged in 15 minute blocks.
 * Backend must own authoritative quotes/payment totals before pilot use.
 */
export function calculateBill(session: Session) {
  const { elapsedMinutes, lockedHourlyRate, mode } = session;
  if (
    !Number.isSafeInteger(elapsedMinutes) ||
    elapsedMinutes < 0 ||
    !Number.isSafeInteger(lockedHourlyRate) ||
    lockedHourlyRate < 0
  ) {
    throw new Error('Invalid billing inputs');
  }
  const included = mode === 'BUNDLE_2H' ? 120 : mode === 'BUNDLE_4H' ? 240 : 0;
  const base = Math.round((included / 60) * lockedHourlyRate * 0.85);
  const meteredMinutes = included
    ? Math.max(0, elapsedMinutes - included - 10)
    : elapsedMinutes;
  const time =
    base + Math.round((Math.ceil(meteredMinutes / 15) * lockedHourlyRate) / 4);
  const items = session.orders.reduce((sum, order) => {
    if (
      !Number.isSafeInteger(order.unitPrice) ||
      order.unitPrice < 0 ||
      !Number.isSafeInteger(order.quantity) ||
      order.quantity < 1
    )
      throw new Error('Invalid order');
    return sum + order.unitPrice * order.quantity;
  }, 0);
  return { time, items, total: time + items };
}
export const formatMoney = (amount: number) =>
  `${amount.toLocaleString('vi-VN')} ₫`;
