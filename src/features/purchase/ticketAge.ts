/**
 * F224 ticket age marker. A ticket open longer than this is marked overdue and moved to the
 * top of the board. The branch-level setting is backend work (see the PR); until then every
 * branch uses this default.
 */
export const TICKET_OVERDUE_MINUTES = 10;

const MINUTE = 60_000;

export type TicketAge = { minutes: number; overdue: boolean };

export function ticketAge(
  createdAt: number,
  now: number,
  limitMinutes = TICKET_OVERDUE_MINUTES,
): TicketAge {
  // A clock running behind the server must not show negative waits.
  const minutes = Math.max(0, Math.floor((now - createdAt) / MINUTE));
  return { minutes, overdue: minutes >= limitMinutes };
}

/** Overdue tickets first, then everything oldest first, so the longest wait is always on top. */
export function sortTicketsByAge<T extends { id: string; createdAt: number }>(
  tickets: readonly T[],
  now: number,
  limitMinutes = TICKET_OVERDUE_MINUTES,
): T[] {
  return [...tickets].sort((a, b) => {
    const overdueA = ticketAge(a.createdAt, now, limitMinutes).overdue;
    const overdueB = ticketAge(b.createdAt, now, limitMinutes).overdue;
    if (overdueA !== overdueB) return overdueA ? -1 : 1;
    return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
  });
}
