/** F217: the payment line staff read out when redisplaying a counter receipt. */
export type PaidWith = {
  method: 'online' | 'cash';
  amount: number;
  tendered: number | null;
  change: number | null;
};

/** Paid time in the branch's timezone, e.g. "28/11/2026 14:05". Falls back to UTC for unknown zones. */
export function formatPaidAt(paidAt: number, timeZone: string): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: zone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(paidAt);
  try {
    return format(timeZone);
  } catch {
    return `${format('UTC')} UTC`;
  }
}

/** Orders whose receipt can be shown: paid or completed, with a settled payment. */
export function hasReceipt(
  order: { status: string; paidAt: number | null },
  paidWith: PaidWith | null,
) {
  return (
    ['paid', 'completed'].includes(order.status) &&
    order.paidAt !== null &&
    paidWith !== null
  );
}
