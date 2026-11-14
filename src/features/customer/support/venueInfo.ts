/** Static demo venue details shown after check-in. No Wi-Fi credentials live
 * in client code; the card only says where guests find them. Real values must
 * come from the venue's backend config. */
export interface VenueInfo {
  wifiName: string;
  /** Where guests find the Wi-Fi password, never the password itself. */
  wifiAccess: string;
  rules: [string, string, string];
}

const INFO: Record<string, VenueInfo> = {
  grind: {
    wifiName: 'Grind-Guest-DEMO',
    wifiAccess: 'Printed on the card at your table.',
    rules: [
      'Keep calls short and take longer ones to the phone booth.',
      'Please push your chair in and clear your table when you leave.',
      'Hot drinks stay away from power strips and laptops.',
    ],
  },
  matcha: {
    wifiName: 'Matcha-Muse-DEMO',
    wifiAccess: 'Shown on the board next to the tea bar.',
    rules: [
      'Studio is a quiet zone: headphones for audio, please.',
      'No outside food; ask us if you have dietary needs.',
      'Tell a team member before moving furniture.',
    ],
  },
  cyber: {
    wifiName: 'CyberPod-DEMO',
    wifiAccess: 'On the screen inside your pod.',
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
  rules: [
    'Be considerate of the people around you.',
    'Keep drinks away from electronics.',
    'Ask a team member if you need anything.',
  ],
};

export function getVenueInfo(venueId: string): VenueInfo {
  return INFO[venueId] ?? FALLBACK;
}
