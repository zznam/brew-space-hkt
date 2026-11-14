import { describe, expect, it } from 'vitest';
import { getVenue, scenarioSessions, type Session } from '../src/core';
import {
  describeOccupancy,
  filterSeats,
  noFilters,
  occupancySummary,
  usualSuggestion,
} from '../src/features/customer/explore/exploreModel';
import type { VisitSnapshot } from '../src/features/customer/shared/visit';

const venue = getVenue('grind');
// Afternoon: seats 1 and 2 (desks) occupied.
const afternoon = scenarioSessions(venue, 'afternoon');
// Morning: seats 1-7 occupied; only the booth (seat 8) is free.
const morning = scenarioSessions(venue, 'morning');
const ids = (seats: { id: string }[]) => seats.map((seat) => seat.id);

function visit(
  n: number,
  overrides: Partial<VisitSnapshot> = {},
): VisitSnapshot {
  return {
    sessionId: `v${n}`,
    venueId: 'grind',
    venueName: venue.name,
    seatId: 'grind-seat-3',
    seatLabel: 'Seat 3',
    seatKind: 'desk',
    mode: 'METERED_OPEN',
    minutes: 60,
    time: 30000,
    items: 0,
    total: 30000,
    orders: [],
    ...overrides,
  };
}
const deskVisits = [visit(1), visit(2), visit(3)];

describe('filterSeats', () => {
  it('returns every seat with no filters', () => {
    expect(filterSeats(venue, afternoon, noFilters())).toHaveLength(8);
  });
  it('filters by kind, combining kinds', () => {
    expect(
      ids(filterSeats(venue, afternoon, { ...noFilters(), kinds: ['booth'] })),
    ).toEqual(['grind-seat-8']);
    expect(
      filterSeats(venue, afternoon, {
        ...noFilters(),
        kinds: ['pod', 'booth'],
      }),
    ).toHaveLength(3);
  });
  it('treats the price cap as inclusive', () => {
    const cheap = filterSeats(venue, afternoon, {
      ...noFilters(),
      maxRate: 30000,
    });
    expect(cheap).toHaveLength(5);
    expect(cheap.every((seat) => seat.hourlyRate <= 30000)).toBe(true);
    expect(
      filterSeats(venue, afternoon, { ...noFilters(), maxRate: 29999 }),
    ).toEqual([]);
  });
  it('hides occupied seats when availableOnly is on', () => {
    const free = filterSeats(venue, afternoon, {
      ...noFilters(),
      availableOnly: true,
    });
    expect(ids(free)).not.toContain('grind-seat-1');
    expect(free).toHaveLength(6);
  });
  it('combines every filter and can return nothing', () => {
    expect(
      filterSeats(venue, morning, {
        kinds: ['desk'],
        maxRate: 30000,
        availableOnly: true,
      }),
    ).toEqual([]);
  });
  it('ignores sessions of other venues', () => {
    const elsewhere: Session[] = scenarioSessions(
      getVenue('matcha'),
      'morning',
    );
    expect(
      filterSeats(venue, elsewhere, { ...noFilters(), availableOnly: true }),
    ).toHaveLength(8);
  });
  it('does not mutate the venue', () => {
    filterSeats(venue, afternoon, { ...noFilters(), kinds: ['booth'] });
    expect(venue.seats).toHaveLength(8);
  });
});

describe('occupancySummary', () => {
  it('counts free seats by kind without exposing occupants', () => {
    const summary = occupancySummary(venue, afternoon);
    expect(summary).toEqual({
      free: 6,
      total: 8,
      byKind: { desk: 3, pod: 2, booth: 1 },
    });
    expect(Object.keys(summary).sort()).toEqual(['byKind', 'free', 'total']);
  });
  it('handles a nearly full room', () => {
    expect(occupancySummary(venue, morning)).toEqual({
      free: 1,
      total: 8,
      byKind: { desk: 0, pod: 0, booth: 1 },
    });
  });
  it('describes counts with plural forms', () => {
    expect(describeOccupancy(occupancySummary(venue, afternoon))).toBe(
      '6 of 8 seats free · 3 desks, 2 pods, 1 booth',
    );
    expect(describeOccupancy(occupancySummary(venue, morning))).toBe(
      '1 of 8 seats free · 1 booth',
    );
    expect(
      describeOccupancy({
        free: 0,
        total: 8,
        byKind: { desk: 0, pod: 0, booth: 0 },
      }),
    ).toBe('0 of 8 seats free');
  });
});

describe('usualSuggestion', () => {
  it('needs at least three visits in this venue', () => {
    expect(usualSuggestion([], venue, afternoon)).toBeNull();
    expect(
      usualSuggestion(deskVisits.slice(0, 2), venue, afternoon),
    ).toBeNull();
    expect(usualSuggestion(deskVisits, venue, afternoon)).not.toBeNull();
  });
  it('ignores visits from other venues', () => {
    const mixed = [
      visit(1),
      visit(2),
      visit(3, { venueId: 'matcha', seatId: 'matcha-seat-3' }),
    ];
    expect(usualSuggestion(mixed, venue, afternoon)).toBeNull();
  });
  it('picks the most frequent kind, mode and item', () => {
    const visits = [
      visit(1, {
        seatKind: 'pod',
        mode: 'BUNDLE_2H',
        orders: [{ name: 'Cold brew', unitPrice: 45000, quantity: 1 }],
      }),
      visit(2, {
        seatKind: 'pod',
        mode: 'BUNDLE_2H',
        orders: [
          { name: 'Croissant', unitPrice: 35000, quantity: 1 },
          { name: 'Cold brew', unitPrice: 45000, quantity: 2 },
        ],
      }),
      visit(3),
    ];
    const suggestion = usualSuggestion(visits, venue, afternoon);
    expect(suggestion).toMatchObject({
      visitCount: 3,
      seatKind: 'pod',
      mode: 'BUNDLE_2H',
      topItem: 'Cold brew',
    });
  });
  it('has no top item when nothing was ordered', () => {
    expect(usualSuggestion(deskVisits, venue, afternoon)?.topItem).toBeNull();
  });
  it('prefers a free favourite seat', () => {
    const suggestion = usualSuggestion(deskVisits, venue, afternoon, [
      'grind-seat-1',
      'grind-seat-4',
    ]);
    // Seat 1 is occupied, so the next free favourite wins.
    expect(suggestion?.seat?.id).toBe('grind-seat-4');
    expect(suggestion?.viaFavourite).toBe(true);
  });
  it('falls back to a free seat of the same kind', () => {
    const suggestion = usualSuggestion(deskVisits, venue, afternoon, [
      'grind-seat-1',
    ]);
    expect(suggestion?.seat?.id).toBe('grind-seat-3');
    expect(suggestion?.viaFavourite).toBe(false);
    expect(suggestion?.reason).toBeNull();
  });
  it('returns no seat with a reason when nothing fits', () => {
    const suggestion = usualSuggestion(deskVisits, venue, morning);
    expect(suggestion?.seat).toBeNull();
    expect(suggestion?.reason).toContain('No desk is free');
  });
});
