import { describe, expect, it } from 'vitest';
import { getVenue, scenarioSessions } from '../src/core';
import {
  describeOccupancy,
  modeLabel,
  MODE_LABEL,
  occupancySummary,
  usualSuggestion,
} from '../src/features/customer/explore/exploreModel';
import {
  descriptionText,
  exploreMessages,
  startErrorText,
} from '../src/features/customer/explore/messages';
import type { VisitSnapshot } from '../src/features/customer/shared/visit';

const venue = getVenue('grind');
const afternoon = scenarioSessions(venue, 'afternoon');
const morning = scenarioSessions(venue, 'morning');
const visit = (n: number): VisitSnapshot => ({
  sessionId: `v${n}`,
  venueId: 'grind',
  venueName: venue.name,
  seatId: 'grind-seat-3',
  seatLabel: 'Seat 3',
  seatKind: 'desk',
  mode: 'BUNDLE_2H',
  minutes: 60,
  time: 30000,
  items: 0,
  total: 30000,
  orders: [],
});

describe('explore i18n', () => {
  it('has a non-empty Vietnamese value for every key', () => {
    for (const [key, value] of Object.entries(exploreMessages.vi))
      expect(value.trim(), key).not.toBe('');
  });
  it('keeps the English start-button labels', () => {
    expect(exploreMessages.en.startMetered).toBe('Start metered');
    expect(exploreMessages.en.startBundle2h).toBe('2h bundle · 15% off');
    expect(exploreMessages.en.startBundle4h).toBe('4h bundle · 15% off');
  });
  it('describes occupancy in both languages', () => {
    const summary = occupancySummary(venue, afternoon);
    expect(describeOccupancy(summary)).toBe(describeOccupancy(summary, 'en'));
    expect(describeOccupancy(summary)).toMatch(/^6 of 8 seats free · /);
    const vi = describeOccupancy(summary, 'vi');
    expect(vi).toMatch(/^Còn 6\/8 chỗ trống · /);
    expect(vi).toContain('bàn đơn');
    const booth = describeOccupancy(occupancySummary(venue, morning), 'vi');
    expect(booth).toBe('Còn 1/8 chỗ trống · 1 bàn nhóm');
  });
  it('labels billing modes', () => {
    expect(modeLabel('BUNDLE_2H')).toBe(MODE_LABEL.BUNDLE_2H);
    expect(modeLabel('METERED_OPEN', 'vi')).toBe('tính theo giờ');
    expect(modeLabel('BUNDLE_4H', 'vi')).toBe('gói 4 giờ');
  });
  it('translates the usual-suggestion reason', () => {
    const visits = [visit(1), visit(2), visit(3)];
    const none = usualSuggestion(visits, venue, morning, []);
    expect(none?.reason).toBe(
      'No desk is free right now. Check back soon or pick another seat.',
    );
    const vi = usualSuggestion(visits, venue, morning, [], 'vi');
    expect(vi?.reason).toBe(
      'Hiện không còn bàn đơn nào trống. Hãy quay lại sau hoặc chọn chỗ khác.',
    );
  });
  it('translates core start errors and venue taglines', () => {
    expect(startErrorText('Select a seat first.', 'en')).toBe(
      'Select a seat first.',
    );
    expect(startErrorText('Select a seat first.', 'vi')).toBe(
      'Hãy chọn một chỗ trước.',
    );
    expect(startErrorText('Something else', 'vi')).toBe('Something else');
    expect(descriptionText(venue.description, 'en')).toBe(venue.description);
    expect(descriptionText(venue.description, 'vi')).not.toBe(
      venue.description,
    );
    expect(descriptionText('Unknown tagline', 'vi')).toBe('Unknown tagline');
  });
});
