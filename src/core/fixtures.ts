import type {
  DemoState,
  Scenario,
  Scene3DConfig,
  Session,
  Venue,
} from './domain';

export const DEMO_CUSTOMER_ID = 'demo-guest';

const SEEDED_SCENES: Record<string, Scene3DConfig> = {
  grind: {
    roomWidth: 12,
    roomDepth: 9,
    wallColor: '#e8ddd3',
    floorColor: '#b9936c',
    ceilingColor: '#f5efe8',
    theme: 'industrial',
    lighting: 'warm-daylight',
    summary:
      'Industrial brick-and-timber loft with a specialty espresso bar, north-facing factory windows, communal oak desks, and acoustic focus pods.',
    fixtures: [
      {
        id: 'grind-bar',
        kind: 'bar',
        label: 'Espresso & Pour-Over Bar',
        x: 0.4,
        z: 0,
        width: 2.8,
        depth: 1.1,
        color: '#5c3a21',
      },
      {
        id: 'grind-machine',
        kind: 'coffee-machine',
        label: 'La Marzocco 3-Group',
        x: 0.9,
        z: 0,
        color: '#2b2d2f',
      },
      {
        id: 'grind-window-1',
        kind: 'window',
        label: 'Street Loft Window West',
        x: 0.6,
        z: -0.6,
        width: 2.2,
      },
      {
        id: 'grind-window-2',
        kind: 'window',
        label: 'Street Loft Window East',
        x: 2.6,
        z: -0.6,
        width: 2.2,
      },
      {
        id: 'grind-door',
        kind: 'door',
        label: 'Main Entrance',
        x: -0.6,
        z: 0.5,
      },
      {
        id: 'grind-shelf',
        kind: 'bookshelf',
        label: 'Roastery Library & Merch',
        x: 3.4,
        z: 0.2,
        color: '#6e472b',
      },
      {
        id: 'grind-plant-1',
        kind: 'plant',
        label: 'Fiddle Leaf Fig',
        x: -0.3,
        z: -0.3,
      },
      {
        id: 'grind-plant-2',
        kind: 'plant',
        label: 'Monstera Planter',
        x: 3.3,
        z: 1.4,
      },
      {
        id: 'grind-pendant-1',
        kind: 'pendant-light',
        label: 'Brass Dome Lamp',
        x: 1,
        z: 0.5,
      },
      {
        id: 'grind-pendant-2',
        kind: 'pendant-light',
        label: 'Brass Dome Lamp',
        x: 2.5,
        z: 0.5,
      },
    ],
  },
  matcha: {
    roomWidth: 12,
    roomDepth: 9,
    wallColor: '#e4ece4',
    floorColor: '#d7d0c2',
    ceilingColor: '#f6f8f5',
    theme: 'botanical',
    lighting: 'bright-studio',
    summary:
      'Sunlit botanical studio with a ceremonial whisk bar, linen-curtained garden windows, natural ash tables, and quiet creative pods.',
    fixtures: [
      {
        id: 'matcha-bar',
        kind: 'bar',
        label: 'Ceremonial Matcha Bar',
        x: 0.5,
        z: -0.1,
        width: 2.6,
        depth: 1.0,
        color: '#41694e',
      },
      {
        id: 'matcha-window-1',
        kind: 'window',
        label: 'Garden Skylight Window',
        x: 1.0,
        z: -0.6,
        width: 2.4,
      },
      {
        id: 'matcha-window-2',
        kind: 'window',
        label: 'Bamboo Courtyard Window',
        x: 2.8,
        z: -0.6,
        width: 2.4,
      },
      {
        id: 'matcha-door',
        kind: 'door',
        label: 'Courtyard Arch Door',
        x: -0.6,
        z: 0.6,
      },
      {
        id: 'matcha-rug',
        kind: 'rug',
        label: 'Woven Tatami Rug',
        x: 2.2,
        z: 1.0,
        width: 2.8,
        depth: 1.8,
        color: '#c9d6c5',
      },
      {
        id: 'matcha-plant-1',
        kind: 'plant',
        label: 'Bamboo Grove Planter',
        x: -0.2,
        z: -0.3,
      },
      {
        id: 'matcha-plant-2',
        kind: 'plant',
        label: 'Hanging Pothos Corner',
        x: 3.4,
        z: -0.2,
      },
      {
        id: 'matcha-plant-3',
        kind: 'plant',
        label: 'Bonsai Display',
        x: 3.4,
        z: 1.3,
      },
      {
        id: 'matcha-partition',
        kind: 'partition',
        label: 'Shoji Acoustic Screen',
        x: 1.5,
        z: 0.9,
      },
    ],
  },
  cyber: {
    roomWidth: 12,
    roomDepth: 9,
    wallColor: '#1e293b',
    floorColor: '#0f172a',
    ceilingColor: '#090d16',
    theme: 'cyber',
    lighting: 'neon-night',
    summary:
      '24/7 high-focus cyber lounge with neon cyan perimeter lighting, acoustic coding pods, dual-monitor desks, and a smart energy bar.',
    fixtures: [
      {
        id: 'cyber-bar',
        kind: 'bar',
        label: 'Smart Energy & Espresso Dock',
        x: 0.4,
        z: -0.1,
        width: 2.5,
        depth: 1.0,
        color: '#1d4ed8',
      },
      {
        id: 'cyber-door',
        kind: 'door',
        label: 'Biometric Glass Entry',
        x: -0.6,
        z: 0.5,
      },
      {
        id: 'cyber-partition-1',
        kind: 'partition',
        label: 'Neon Acoustic Baffle',
        x: 1.5,
        z: 0.6,
        color: '#38bdf8',
      },
      {
        id: 'cyber-partition-2',
        kind: 'partition',
        label: 'Pod Zone Divider',
        x: 2.5,
        z: 0.6,
        color: '#2563eb',
      },
      {
        id: 'cyber-shelf',
        kind: 'bookshelf',
        label: 'Hardware & Gear Locker',
        x: 3.4,
        z: 0.1,
        color: '#334155',
      },
      {
        id: 'cyber-pendant-1',
        kind: 'pendant-light',
        label: 'Cyan Halo Light',
        x: 0.8,
        z: 0.4,
      },
      {
        id: 'cyber-pendant-2',
        kind: 'pendant-light',
        label: 'Cyan Halo Light',
        x: 2.4,
        z: 0.9,
      },
    ],
  },
};

export const venues: Venue[] = [
  {
    id: 'grind',
    name: 'The Grind Co-Work',
    accent: '#88502d',
    description: 'Warm coffee. Clear thinking.',
    drink: 'Cold brew',
  },
  {
    id: 'matcha',
    name: 'Matcha & Muse Studio',
    accent: '#41694e',
    description: 'A little room for your next idea.',
    drink: 'Oat matcha',
  },
  {
    id: 'cyber',
    name: 'CyberPod 24/7 Hub',
    accent: '#275b91',
    description: 'Find your focus, any time.',
    drink: 'Iced espresso',
  },
].map(({ drink, ...venue }) => ({
  ...venue,
  seats: Array.from({ length: 8 }, (_, i) => ({
    id: `${venue.id}-seat-${i + 1}`,
    venueId: venue.id,
    label: `Seat ${i + 1}`,
    kind: i === 7 ? 'booth' : i > 4 ? 'pod' : 'desk',
    x: i % 4,
    z: Math.floor(i / 4),
    hourlyRate: i > 4 ? 40000 : 30000,
    zone: i === 7 ? 'Group Lounge' : i > 4 ? 'Quiet Focus Zone' : 'Main Floor',
  })),
  menu: [
    { id: `${venue.id}-drink`, name: drink, price: 45000 },
    { id: `${venue.id}-snack`, name: 'Butter croissant', price: 35000 },
  ],
  scene3d: SEEDED_SCENES[venue.id],
}));

let activeCustomVenues: readonly Venue[] = [];

/** Syncs custom onboarded venues so read-only helpers resolve them without mutating `venues`. */
export function setActiveCustomVenues(customVenues: readonly Venue[] = []) {
  activeCustomVenues = [...customVenues];
}

export function getAllVenues(
  customVenues: readonly Venue[] = activeCustomVenues,
): Venue[] {
  if (!customVenues || customVenues.length === 0) return [...venues];
  const byId = new Map<string, Venue>();
  for (const v of venues) byId.set(v.id, v);
  for (const custom of customVenues) byId.set(custom.id, custom);
  return Array.from(byId.values());
}

export function scenarioSessions(venue: Venue, scenario: Scenario): Session[] {
  const count =
    scenario === 'morning'
      ? Math.max(1, Math.min(venue.seats.length - 1, 7))
      : Math.min(2, venue.seats.length);
  return venue.seats.slice(0, count).map((seat, i) => ({
    id: `seed-${venue.id}-${i}`,
    venueId: venue.id,
    seatId: seat.id,
    customerId: `sample-guest-${i}`,
    mode: 'METERED_OPEN',
    elapsedMinutes: 15 + i * 10,
    lockedHourlyRate: seat.hourlyRate,
    orders: [],
  }));
}
export function initialState(): DemoState {
  return {
    role: 'merchant',
    venueId: 'grind',
    scenario: 'afternoon',
    selectedSeatId: null,
    sessions: venues.flatMap((venue) => scenarioSessions(venue, 'afternoon')),
    nextSessionId: 1,
  };
}
export function getVenue(
  id: string,
  customVenues: readonly Venue[] = activeCustomVenues,
): Venue {
  const custom = customVenues.find((item) => item.id === id);
  if (custom) return custom;
  const venue = venues.find((item) => item.id === id);
  if (!venue) throw new Error(`Unknown venue: ${id}`);
  return venue;
}
