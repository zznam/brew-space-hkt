import { describe, expect, it } from 'vitest';
import {
  sortTicketsByAge,
  ticketAge,
  TICKET_OVERDUE_MINUTES,
} from '../src/features/purchase/ticketAge';

const MIN = 60_000;
const now = 1_800_000_000_000;

describe('F224 ticket age marker', () => {
  it('counts whole minutes and marks a ticket overdue at the limit', () => {
    expect(ticketAge(now - 59_999, now)).toEqual({
      minutes: 0,
      overdue: false,
    });
    expect(
      ticketAge(now - (TICKET_OVERDUE_MINUTES - 1) * MIN, now).overdue,
    ).toBe(false);
    expect(ticketAge(now - TICKET_OVERDUE_MINUTES * MIN, now)).toEqual({
      minutes: TICKET_OVERDUE_MINUTES,
      overdue: true,
    });
    expect(ticketAge(now - 3 * MIN, now, 3).overdue).toBe(true);
  });

  it('never shows a negative wait when the device clock is behind', () => {
    expect(ticketAge(now + 5 * MIN, now)).toEqual({
      minutes: 0,
      overdue: false,
    });
  });

  it('sorts overdue tickets first, then oldest first, stably by id', () => {
    const tickets = [
      { id: 'fresh', createdAt: now - 1 * MIN },
      { id: 'late-b', createdAt: now - 12 * MIN },
      { id: 'older-fresh', createdAt: now - 5 * MIN },
      { id: 'late-a', createdAt: now - 12 * MIN },
      { id: 'oldest', createdAt: now - 30 * MIN },
    ];
    expect(sortTicketsByAge(tickets, now).map((t) => t.id)).toEqual([
      'oldest',
      'late-a',
      'late-b',
      'older-fresh',
      'fresh',
    ]);
    expect(tickets[0]?.id).toBe('fresh');
  });
});
