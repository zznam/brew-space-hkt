/** Static demo venue details shown after check-in. No Wi-Fi credentials live
 * in client code; the card only says where guests find them. Real values must
 * come from the venue's backend config. */
export interface VenueInfo {
  wifiName: string;
  /** Where guests find the Wi-Fi password, never the password itself. */
  wifiAccess: string;
  rules: [string, string, string];
  /** Demo street address (not a real place). Real values come from the
   * venue's backend config. */
  address: string;
  /** Venue clock offset from UTC in minutes, used to read the device clock in
   * venue time. Fixed offsets only: the demo venues are in a zone without DST. */
  utcOffsetMinutes: number;
  /** Opening hours per weekday, index 0 = Sunday ... 6 = Saturday. `null`
   * means closed all day. Times are 24h "HH:MM" in venue time; "24:00" is
   * end of day. Demo data until the backend owns opening hours (F140). */
  hours: (DayHours | null)[];
}
export interface DayHours {
  open: string;
  close: string;
}
const HO_CHI_MINH_OFFSET = 7 * 60;
const week = (
  weekday: DayHours | null,
  saturday: DayHours | null,
  sunday: DayHours | null,
): (DayHours | null)[] => [
  sunday,
  weekday,
  weekday,
  weekday,
  weekday,
  weekday,
  saturday,
];

const INFO: Record<string, VenueInfo> = {
  grind: {
    wifiName: 'Grind-Guest-DEMO',
    wifiAccess: 'Printed on the card at your table.',
    address: '12 Demo Lane, District 1, Ho Chi Minh City (demo address)',
    utcOffsetMinutes: HO_CHI_MINH_OFFSET,
    hours: week(
      { open: '07:30', close: '21:00' },
      { open: '08:30', close: '22:00' },
      { open: '09:00', close: '18:00' },
    ),
    rules: [
      'Keep calls short and take longer ones to the phone booth.',
      'Please push your chair in and clear your table when you leave.',
      'Hot drinks stay away from power strips and laptops.',
    ],
  },
  matcha: {
    wifiName: 'Matcha-Muse-DEMO',
    wifiAccess: 'Shown on the board next to the tea bar.',
    address: '34 Sample Street, District 3, Ho Chi Minh City (demo address)',
    utcOffsetMinutes: HO_CHI_MINH_OFFSET,
    hours: week(
      { open: '09:00', close: '20:00' },
      { open: '09:00', close: '20:00' },
      null,
    ),
    rules: [
      'Studio is a quiet zone: headphones for audio, please.',
      'No outside food; ask us if you have dietary needs.',
      'Tell a team member before moving furniture.',
    ],
  },
  cyber: {
    wifiName: 'CyberPod-DEMO',
    wifiAccess: 'On the screen inside your pod.',
    address: '56 Example Road, Binh Thanh, Ho Chi Minh City (demo address)',
    utcOffsetMinutes: HO_CHI_MINH_OFFSET,
    hours: week(
      { open: '00:00', close: '24:00' },
      { open: '00:00', close: '24:00' },
      { open: '00:00', close: '24:00' },
    ),
    rules: [
      'Keep gaming audio in headphones.',
      'Drinks go in the holders, never next to keyboards.',
      'Pods are cleaned between guests; report any issue right away.',
    ],
  },
};

const FALLBACK: VenueInfo = {
  wifiName: 'Venue-Guest-DEMO',
  wifiAccess: 'Ask a team member.',
  address: 'Ask a team member for the address (demo venue).',
  utcOffsetMinutes: HO_CHI_MINH_OFFSET,
  hours: week(null, null, null),
  rules: [
    'Be considerate of the people around you.',
    'Keep drinks away from electronics.',
    'Ask a team member if you need anything.',
  ],
};

export function getVenueInfo(venueId: string): VenueInfo {
  return INFO[venueId] ?? FALLBACK;
}
