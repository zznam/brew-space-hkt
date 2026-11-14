import type { DemoState, Scenario, Session, Venue } from './domain';

export const DEMO_CUSTOMER_ID = 'demo-guest';
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
  })),
  menu: [
    { id: `${venue.id}-drink`, name: drink, price: 45000 },
    { id: `${venue.id}-snack`, name: 'Butter croissant', price: 35000 },
  ],
}));

export function scenarioSessions(venue: Venue, scenario: Scenario): Session[] {
  return venue.seats
    .slice(0, scenario === 'morning' ? 7 : 2)
    .map((seat, i) => ({
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
export function getVenue(id: string): Venue {
  const venue = venues.find((item) => item.id === id);
  if (!venue) throw new Error(`Unknown venue: ${id}`);
  return venue;
}
