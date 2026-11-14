import { getAllVenues } from '../../../core/fixtures';
import type { Lang } from '../i18n/i18n';
import { venueT } from './messages';

/** Shareable seat links (F137). The link carries only a venue id and a seat
 * id: no customer, session, price or booking data. Time preselection is out of
 * scope for the demo. */
export const SEAT_LINK_PATH = '/customer/explore';

type Param = string | string[] | undefined;
export interface SeatLinkParams {
  venue?: Param;
  seat?: Param;
}
const clean = (value: Param): string | null => {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : null;
};

export interface ParsedSeatLink {
  /** True when the link asked for anything at all. */
  requested: boolean;
  /** Valid venue to switch to, or null to stay in the active venue. */
  venueId: string | null;
  /** Valid seat in the resulting venue, or null. */
  seatId: string | null;
  /** Gentle message when part of the link was ignored. */
  notice: string | null;
}

/** Validates link params against the fixtures. `activeVenueId` is where a
 * seat-only link is resolved. Unknown ids are ignored, never thrown. */
export function parseSeatLink(
  params: SeatLinkParams,
  activeVenueId: string,
  lang: Lang = 'en',
): ParsedSeatLink {
  const venueParam = clean(params.venue);
  const seatParam = clean(params.seat);
  if (!venueParam && !seatParam)
    return { requested: false, venueId: null, seatId: null, notice: null };
  let target = getAllVenues().find((venue) => venue.id === activeVenueId);
  let venueId: string | null = null;
  if (venueParam) {
    const found = getAllVenues().find((venue) => venue.id === venueParam);
    if (!found)
      return {
        requested: true,
        venueId: null,
        seatId: null,
        notice: venueT(lang)('linkUnknownVenue'),
      };
    target = found;
    venueId = found.id === activeVenueId ? null : found.id;
  }
  if (!seatParam || !target)
    return { requested: true, venueId, seatId: null, notice: null };
  const seat = target.seats.find((entry) => entry.id === seatParam);
  return {
    requested: true,
    venueId,
    seatId: seat ? seat.id : null,
    notice: seat
      ? null
      : venueT(lang)('linkUnknownSeat', { venue: target.name }),
  };
}

/** Relative path, or absolute when an origin (web) is given. */
export function buildSeatLink(
  venueId: string,
  seatId: string,
  origin?: string | null,
) {
  const path = `${SEAT_LINK_PATH}?venue=${encodeURIComponent(venueId)}&seat=${encodeURIComponent(seatId)}`;
  return origin ? `${origin.replace(/\/+$/, '')}${path}` : path;
}
