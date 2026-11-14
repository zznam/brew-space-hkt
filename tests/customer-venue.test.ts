import { describe, expect, it } from 'vitest';
import { calculateBill, getVenue, venues } from '../src/core';
import { getVenueInfo } from '../src/features/customer/support/venueInfo';
import {
  buildSeatLink,
  parseSeatLink,
} from '../src/features/customer/venue/deepLink';
import {
  AMENITIES,
  seatAmenities,
  venueAmenities,
} from '../src/features/customer/venue/seatAmenities';
import {
  describeHours,
  estimateSeat,
  isOpenAt,
  priceTable,
  seatStatusText,
  venuePageInfo,
} from '../src/features/customer/venue/venueModel';

const bill = (
  venueId: string,
  hourlyRate: number,
  mode: 'METERED_OPEN' | 'BUNDLE_2H' | 'BUNDLE_4H',
  elapsedMinutes: number,
) =>
  calculateBill({
    id: 'x',
    venueId,
    seatId: 'x',
    customerId: 'x',
    mode,
    elapsedMinutes,
    lockedHourlyRate: hourlyRate,
    orders: [],
  }).total;

describe('seat amenities', () => {
  it('are deterministic', () => {
    for (const venue of venues) {
      expect(venueAmenities(venue)).toEqual(venueAmenities(venue));
      for (const seat of venue.seats)
        expect(seatAmenities(seat)).toEqual(seatAmenities({ ...seat }));
    }
  });
  it('cover every seat of every venue, each amenity present and absent', () => {
    expect(venues).toHaveLength(3);
    for (const venue of venues) {
      const map = venueAmenities(venue);
      expect(Object.keys(map).sort()).toEqual(
        venue.seats.map((seat) => seat.id).sort(),
      );
      for (const { key } of AMENITIES) {
        const have = Object.values(map).filter((list) => list.includes(key));
        expect(have.length, `${venue.id} ${key}`).toBeGreaterThan(0);
        expect(have.length, `${venue.id} ${key}`).toBeLessThan(
          venue.seats.length,
        );
      }
    }
  });
  it('list amenities without duplicates', () => {
    for (const seat of getVenue('grind').seats) {
      const list = seatAmenities(seat);
      expect(new Set(list).size).toBe(list.length);
    }
  });
});

describe('price table and estimates', () => {
  it('lists every kind with core calculateBill prices', () => {
    for (const venue of venues) {
      const rows = priceTable(venue);
      expect(rows.map((row) => row.kind)).toEqual(['desk', 'pod', 'booth']);
      for (const row of rows) {
        expect(row.metered1h).toBe(
          bill(venue.id, row.hourlyRate, 'METERED_OPEN', 60),
        );
        expect(row.bundle2h).toBe(
          bill(venue.id, row.hourlyRate, 'BUNDLE_2H', 0),
        );
        expect(row.bundle4h).toBe(
          bill(venue.id, row.hourlyRate, 'BUNDLE_4H', 0),
        );
        const seats = venue.seats.filter((seat) => seat.kind === row.kind);
        expect(row.seatCount).toBe(seats.length);
        expect(row.hourlyRate).toBe(
          Math.min(...seats.map((seat) => seat.hourlyRate)),
        );
      }
    }
  });
  it('matches known fixture values', () => {
    const [desk, pod] = priceTable(getVenue('grind'));
    expect(desk).toMatchObject({
      hourlyRate: 30000,
      metered1h: 30000,
      bundle2h: 51000,
      bundle4h: 102000,
    });
    expect(pod).toMatchObject({ hourlyRate: 40000, bundle2h: 68000 });
  });
  it('estimates a seat with the same core results', () => {
    const seat = getVenue('cyber').seats[7]!;
    expect(estimateSeat(seat)).toEqual({
      metered1h: bill('cyber', seat.hourlyRate, 'METERED_OPEN', 60),
      bundle2h: bill('cyber', seat.hourlyRate, 'BUNDLE_2H', 120),
      bundle4h: bill('cyber', seat.hourlyRate, 'BUNDLE_4H', 240),
    });
  });
  it('flags kinds whose rates differ', () => {
    const venue = getVenue('grind');
    const mixed = {
      ...venue,
      seats: venue.seats.map((seat, i) =>
        i === 0 ? { ...seat, hourlyRate: 20000 } : seat,
      ),
    };
    expect(priceTable(mixed)[0]).toMatchObject({
      hourlyRate: 20000,
      varies: true,
    });
    expect(priceTable(venue).every((row) => !row.varies)).toBe(true);
  });
  it('status text never names an occupant', () => {
    expect(seatStatusText(true)).toBe('Occupied right now');
    expect(seatStatusText(false)).toBe('Available now');
  });
});

describe('opening hours', () => {
  const info = getVenueInfo('grind');
  // 2026-11-16 is a Monday. Venue time is UTC+7.
  const at = (iso: string) => new Date(iso);
  it('describes grouped days', () => {
    expect(describeHours(info.hours)).toEqual([
      { days: 'Mon - Fri', text: '07:30 - 21:00' },
      { days: 'Sat', text: '08:30 - 22:00' },
      { days: 'Sun', text: '09:00 - 18:00' },
    ]);
    expect(describeHours(getVenueInfo('cyber').hours)).toEqual([
      { days: 'Every day', text: 'Open 24 hours' },
    ]);
    expect(describeHours(getVenueInfo('matcha').hours)).toEqual([
      { days: 'Mon - Sat', text: '09:00 - 20:00' },
      { days: 'Sun', text: 'Closed' },
    ]);
  });
  it('computes open now in venue time from the device clock', () => {
    // Monday 08:00 venue time = 01:00 UTC.
    expect(isOpenAt(info.hours, 420, at('2026-11-16T01:00:00Z'))).toBe(true);
    // Monday 07:00 venue time = 00:00 UTC, before opening.
    expect(isOpenAt(info.hours, 420, at('2026-11-16T00:00:00Z'))).toBe(false);
    // The closing minute is closed: 21:00 venue time = 14:00 UTC.
    expect(isOpenAt(info.hours, 420, at('2026-11-16T14:00:00Z'))).toBe(false);
    // Sunday 20:00 venue time (13:00 UTC) is after Sunday closing.
    expect(isOpenAt(info.hours, 420, at('2026-11-15T13:00:00Z'))).toBe(false);
    // Sunday 23:30 UTC is already Monday 06:30 venue time: closed.
    expect(isOpenAt(info.hours, 420, at('2026-11-15T23:30:00Z'))).toBe(false);
    // Sunday 20:00 UTC is Monday 03:00 venue time: still closed (not Sunday).
    expect(isOpenAt(info.hours, 420, at('2026-11-15T20:00:00Z'))).toBe(false);
  });
  it('handles closed days and 24h venues', () => {
    const matcha = getVenueInfo('matcha');
    // Sunday 12:00 venue time (05:00 UTC): matcha is closed on Sunday.
    expect(isOpenAt(matcha.hours, 420, at('2026-11-15T05:00:00Z'))).toBe(false);
    const cyber = getVenueInfo('cyber');
    expect(isOpenAt(cyber.hours, 420, at('2026-11-15T20:00:00Z'))).toBe(true);
  });
  it('does not guess without published hours or a valid clock', () => {
    const fallback = getVenueInfo('unknown');
    expect(
      isOpenAt(fallback.hours, 420, at('2026-11-16T01:00:00Z')),
    ).toBeNull();
    expect(isOpenAt(info.hours, 420, new Date('invalid'))).toBeNull();
    expect(venuePageInfo(getVenue('grind'), null).openNow).toBeNull();
  });
  it('every venue has an address, hours and three price rows', () => {
    for (const venue of venues) {
      const page = venuePageInfo(venue, null);
      expect(page.address).toContain('demo');
      expect(page.hours.length).toBeGreaterThan(0);
      expect(page.prices).toHaveLength(3);
    }
  });
});

describe('seat link parsing', () => {
  it('ignores a link with no params', () => {
    expect(parseSeatLink({}, 'grind')).toEqual({
      requested: false,
      venueId: null,
      seatId: null,
      notice: null,
    });
    expect(parseSeatLink({ venue: '  ', seat: '' }, 'grind').requested).toBe(
      false,
    );
  });
  it('accepts a valid seat in the active venue', () => {
    expect(parseSeatLink({ seat: 'grind-seat-3' }, 'grind')).toEqual({
      requested: true,
      venueId: null,
      seatId: 'grind-seat-3',
      notice: null,
    });
    expect(
      parseSeatLink({ venue: 'grind', seat: 'grind-seat-3' }, 'grind').venueId,
    ).toBeNull();
  });
  it('switches venue for a valid venue and seat', () => {
    expect(
      parseSeatLink({ venue: 'matcha', seat: 'matcha-seat-8' }, 'grind'),
    ).toEqual({
      requested: true,
      venueId: 'matcha',
      seatId: 'matcha-seat-8',
      notice: null,
    });
  });
  it('switches venue alone without a seat', () => {
    expect(parseSeatLink({ venue: 'cyber' }, 'grind')).toEqual({
      requested: true,
      venueId: 'cyber',
      seatId: null,
      notice: null,
    });
  });
  it('ignores an unknown venue (and its seat) with a notice', () => {
    const result = parseSeatLink(
      { venue: 'nowhere', seat: 'grind-seat-3' },
      'grind',
    );
    expect(result).toMatchObject({ venueId: null, seatId: null });
    expect(result.notice).toContain('venue');
  });
  it('ignores an unknown seat with a notice but still switches venue', () => {
    const result = parseSeatLink(
      { venue: 'matcha', seat: 'matcha-seat-99' },
      'grind',
    );
    expect(result).toMatchObject({ venueId: 'matcha', seatId: null });
    expect(result.notice).toContain('Matcha & Muse Studio');
  });
  it('ignores a seat that belongs to another venue', () => {
    const mismatch = parseSeatLink(
      { venue: 'grind', seat: 'matcha-seat-1' },
      'grind',
    );
    expect(mismatch).toMatchObject({ venueId: null, seatId: null });
    expect(mismatch.notice).not.toBeNull();
    const seatOnly = parseSeatLink({ seat: 'cyber-seat-1' }, 'grind');
    expect(seatOnly).toMatchObject({ venueId: null, seatId: null });
    expect(seatOnly.notice).not.toBeNull();
  });
  it('uses the first value of repeated params', () => {
    expect(
      parseSeatLink(
        { venue: ['matcha', 'grind'], seat: ['matcha-seat-2'] },
        'grind',
      ),
    ).toMatchObject({ venueId: 'matcha', seatId: 'matcha-seat-2' });
  });
});

describe('share link', () => {
  it('is a relative path with only venue and seat ids', () => {
    const link = buildSeatLink('grind', 'grind-seat-3');
    expect(link).toBe('/customer/explore?venue=grind&seat=grind-seat-3');
    const params = new URL(link, 'http://x.test').searchParams;
    expect([...params.keys()].sort()).toEqual(['seat', 'venue']);
  });
  it('is absolute when an origin is given', () => {
    const link = buildSeatLink('cyber', 'cyber-seat-8', 'https://demo.test/');
    expect(link).toBe(
      'https://demo.test/customer/explore?venue=cyber&seat=cyber-seat-8',
    );
    const url = new URL(link);
    expect([...url.searchParams.keys()].sort()).toEqual(['seat', 'venue']);
  });
  it('round-trips through the parser for every seat', () => {
    for (const venue of venues)
      for (const seat of venue.seats) {
        const params = new URL(
          buildSeatLink(venue.id, seat.id),
          'http://x.test',
        ).searchParams;
        expect(
          parseSeatLink(
            {
              venue: params.get('venue') ?? undefined,
              seat: params.get('seat') ?? undefined,
            },
            'grind',
          ),
        ).toMatchObject({ seatId: seat.id, notice: null });
      }
  });
});
