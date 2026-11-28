import { describe, expect, it } from 'vitest';
import { readyNotice } from '../src/features/purchase/readyNotice';

describe('F226 order-ready notice', () => {
  it('stays silent until a ticket is ready', () => {
    expect(readyNotice([], 'A12')).toBeNull();
    expect(
      readyNotice(
        [{ status: 'queued' }, { status: 'preparing', destination: 'Seat 3' }],
        'A12',
      ),
    ).toBeNull();
    expect(
      readyNotice([{ status: 'served', destination: 'Counter' }], 'A12'),
    ).toBeNull();
  });

  it('gives counter orders a pickup number', () => {
    expect(
      readyNotice([{ status: 'ready', destination: 'Counter' }], 'A12'),
    ).toEqual({ kind: 'pickup', code: 'A12' });
    expect(readyNotice([{ status: 'ready' }], 'B7')).toEqual({
      kind: 'pickup',
      code: 'B7',
    });
  });

  it('tells seated customers where it is coming', () => {
    expect(
      readyNotice(
        [{ status: 'queued' }, { status: 'ready', destination: ' Seat 3 ' }],
        'A12',
      ),
    ).toEqual({
      kind: 'serve',
      destination: 'Seat 3',
    });
  });
});
