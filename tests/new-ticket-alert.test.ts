import { describe, expect, it } from 'vitest';
import { arrivedTickets, playChime } from '../src/features/purchase/newTickets';

describe('F161 new ticket alert', () => {
  it('reports nothing on the first load', () => {
    expect(arrivedTickets(null, [{ id: 't1' }, { id: 't2' }])).toEqual([]);
  });

  it('reports only tickets not seen before, in list order', () => {
    expect(
      arrivedTickets(new Set(['t1']), [
        { id: 't3' },
        { id: 't1' },
        { id: 't2' },
      ]),
    ).toEqual([{ id: 't3' }, { id: 't2' }]);
    expect(arrivedTickets(new Set(['t1', 't2']), [{ id: 't2' }])).toEqual([]);
  });

  it('never throws where Web Audio is missing', () => {
    expect(() => playChime()).not.toThrow();
  });
});
