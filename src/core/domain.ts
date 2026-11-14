/** Money is integer VND. Demo state is not an authorization or payment system. */
export type Role = 'merchant' | 'customer';
export type Scenario = 'morning' | 'afternoon';
export type BillingMode = 'METERED_OPEN' | 'BUNDLE_2H' | 'BUNDLE_4H';
export type Scene3DTheme =
  'industrial' | 'botanical' | 'cyber' | 'warm-minimal';
export type Scene3DLighting =
  'warm-daylight' | 'cozy-amber' | 'neon-night' | 'bright-studio';
export type Scene3DFixtureKind =
  | 'bar'
  | 'window'
  | 'door'
  | 'plant'
  | 'bookshelf'
  | 'pendant-light'
  | 'partition'
  | 'rug'
  | 'coffee-machine'
  | 'sofa-lounge';
export interface Scene3DFixture {
  id: string;
  kind: Scene3DFixtureKind;
  label: string;
  x: number;
  z: number;
  width?: number;
  depth?: number;
  rotationY?: number;
  color?: string;
}
export interface Scene3DConfig {
  roomWidth: number;
  roomDepth: number;
  wallColor: string;
  floorColor: string;
  ceilingColor?: string;
  theme: Scene3DTheme;
  lighting: Scene3DLighting;
  summary?: string;
  fixtures: Scene3DFixture[];
}
export interface Seat {
  id: string;
  venueId: string;
  label: string;
  kind: 'desk' | 'booth' | 'pod';
  x: number;
  z: number;
  hourlyRate: number;
  rotationY?: number;
  zone?: string;
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
  scene3d?: Scene3DConfig;
  isCustom?: boolean;
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
  customVenues?: Venue[];
}
export type ActionResult = { ok: true } | { ok: false; message: string };
