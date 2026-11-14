/** Money is integer VND. Demo state is not an authorization or payment system. */
export type Role = 'merchant' | 'customer';
export type Scenario = 'morning' | 'afternoon';
export type BillingMode = 'METERED_OPEN' | 'BUNDLE_2H' | 'BUNDLE_4H';
export interface Seat {
  id: string;
  venueId: string;
  label: string;
  kind: 'desk' | 'booth' | 'pod';
  x: number;
  z: number;
  hourlyRate: number;
}
export interface MenuItem {
  id: string;
  name: string;
  price: number;
}
export interface Venue {
  id: string;
  name: string;
  accent: string;
  description: string;
  seats: Seat[];
  menu: MenuItem[];
}
export interface Session {
  id: string;
  venueId: string;
  seatId: string;
  customerId: string;
  mode: BillingMode;
  elapsedMinutes: number;
  lockedHourlyRate: number;
  orders: {
    menuItemId: string;
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
}
export interface DemoState {
  role: Role;
  venueId: string;
  scenario: Scenario;
  selectedSeatId: string | null;
  sessions: Session[];
  nextSessionId: number;
}
export type ActionResult = { ok: true } | { ok: false; message: string };
