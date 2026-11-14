import { describe, expect, it } from 'vitest';
import { getVenue } from '../src/core';
import { parseSeatLink } from '../src/features/customer/venue/deepLink';
import {
  kindName,
  kindWord,
  seatLabelText,
  venueMessages,
} from '../src/features/customer/venue/messages';
import {
  describeAmenities,
  seatAmenities,
} from '../src/features/customer/venue/seatAmenities';
import {
  describeHours,
  seatStatusText,
  venuePageInfo,
} from '../src/features/customer/venue/venueModel';
import { getVenueInfo } from '../src/features/customer/support/venueInfo';

describe('venue i18n', () => {
  it('has a non-empty Vietnamese value for every key', () => {
    for (const [key, value] of Object.entries(venueMessages.vi))
      expect(value.trim(), key).not.toBe('');
  });
  it('keeps English output unchanged by default', () => {
    expect(seatStatusText(true)).toBe('Occupied right now');
    expect(seatStatusText(false)).toBe('Available now');
    expect(describeAmenities([])).toBe('No listed amenities');
    expect(describeAmenities(['power', 'quiet'])).toBe(
      'Power outlet, Quiet zone',
    );
    expect(kindWord('desk', 'en', 3)).toBe('desks');
    expect(kindWord('pod', 'en')).toBe('pod');
    expect(kindName('booth', 'en')).toBe('Booth');
    expect(seatLabelText('Seat 3', 'en')).toBe('Seat 3');
  });
  it('translates seat words and labels', () => {
    expect(seatStatusText(true, 'vi')).toBe('Đang có người ngồi');
    expect(seatStatusText(false, 'vi')).toBe('Đang trống');
    expect(kindWord('desk', 'vi', 3)).toBe('bàn đơn');
    expect(kindName('pod', 'vi')).toBe('Buồng riêng');
    expect(kindName('booth', 'vi')).toBe('Bàn nhóm');
    expect(seatLabelText('Seat 3', 'vi')).toBe('Chỗ 3');
    expect(seatLabelText('Booth Seat', 'vi')).toBe('Booth Seat');
  });
  it('translates amenities', () => {
    const amenities = seatAmenities({ kind: 'pod', x: 0, z: 1 });
    expect(describeAmenities(amenities, 'vi')).toContain('Ổ cắm điện');
    expect(describeAmenities([], 'vi')).toBe(
      'Chưa có tiện ích nào được liệt kê',
    );
  });
  it('translates opening hours and day names', () => {
    const grind = getVenueInfo('grind').hours;
    const en = describeHours(grind);
    const vi = describeHours(grind, 'vi');
    expect(en.map((line) => line.days)).toEqual(['Mon - Fri', 'Sat', 'Sun']);
    expect(vi.map((line) => line.days)).toEqual(['T2 - T6', 'T7', 'CN']);
    expect(vi.map((line) => line.text)).toEqual(en.map((line) => line.text));
    const cyber = describeHours(getVenueInfo('cyber').hours, 'vi');
    expect(cyber).toEqual([{ days: 'Hằng ngày', text: 'Mở cửa 24 giờ' }]);
    const matcha = describeHours(getVenueInfo('matcha').hours, 'vi');
    expect(matcha.at(-1)).toEqual({ days: 'CN', text: 'Đóng cửa' });
    expect(describeHours([], 'vi')[0]?.text).toBe(
      'Chưa công bố giờ mở cửa cho quán demo này',
    );
    expect(describeHours([])[0]).toEqual({
      days: 'Hours',
      text: 'Not published for this demo venue',
    });
  });
  it('translates venue page info and shared link notices', () => {
    const venue = getVenue('grind');
    const en = venuePageInfo(venue, null);
    const vi = venuePageInfo(venue, null, 'vi');
    expect(en.address).toContain('Demo Lane');
    expect(vi.address).toContain('địa chỉ demo');
    expect(parseSeatLink({ venue: 'nowhere' }, 'grind').notice).toBe(
      'That link points to a venue we could not find, so it was ignored.',
    );
    expect(parseSeatLink({ venue: 'nowhere' }, 'grind', 'vi').notice).toContain(
      'Liên kết này',
    );
    const seatNotice = parseSeatLink({ seat: 'x' }, 'grind', 'vi').notice;
    expect(seatNotice).toContain(venue.name);
    expect(seatNotice).toContain('chỗ');
  });
});
