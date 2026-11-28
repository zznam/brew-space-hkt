import { describe, expect, it } from 'vitest';
import { floorSummary } from '../src/components/seat/floorSummary';

describe('F260 floor text summary', () => {
  const seats = [
    { id: 's1', zone: 'Main Floor' },
    { id: 's2', zone: 'Quiet Focus Zone' },
    { id: 's3', zone: 'Main Floor' },
    { id: 's4' },
    { id: 's5', zone: '  ' },
  ];

  it('counts free seats per zone in venue order, unzoned last', () => {
    const sessions = [
      { venueId: 'v1', seatId: 's1' },
      { venueId: 'v2', seatId: 's2' },
      { venueId: 'v1', seatId: 's4' },
    ];
    expect(floorSummary('v1', seats, sessions)).toEqual([
      { zone: 'Main Floor', free: 1, total: 2 },
      { zone: 'Quiet Focus Zone', free: 1, total: 1 },
      { zone: null, free: 1, total: 2 },
    ]);
  });

  it('handles an empty floor', () => {
    expect(floorSummary('v1', [], [])).toEqual([]);
  });
});
