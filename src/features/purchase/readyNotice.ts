/** F226: what the customer's open order screen says once a ticket is ready. */
export type ReadyNotice =
  { kind: 'pickup'; code: string } | { kind: 'serve'; destination: string };

export function readyNotice(
  tickets: readonly { status: string; destination?: string }[],
  orderCode: string,
): ReadyNotice | null {
  const ready = tickets.find((ticket) => ticket.status === 'ready');
  if (!ready) return null;
  const destination = ready.destination?.trim() ?? '';
  // Counter tickets are collected with the order code as the pickup number.
  return !destination || destination === 'Counter'
    ? { kind: 'pickup', code: orderCode }
    : { kind: 'serve', destination };
}
