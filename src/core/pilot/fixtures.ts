import { venues } from '../fixtures';
import type { Venue } from '../domain';
import { passwordHash } from './access';
import { syncQr } from './layout';
import type { Db, TenantSettings, World } from './types';

export const defaultTenantSettings = (): TenantSettings => ({
  fees: [],
  loyalty: {
    earnPerPoint: 10000,
    redeemValue: 1000,
    redeemCapPercent: 20,
    minOrdersForSuggestion: 10,
  },
  seatPackages: [30, 60, 120, 240],
  floorHourlyRate: 10000,
  maxDiscountPercent: 30,
  aiEnabled: false,
  aiBudget: 30,
  aiSpent: 0,
  aiConfidenceMin: 0.8,
  retention: { customerDays: 365, aiLogDays: 30, auditDays: 365 },
  counterPaymentMinutes: 10,
  largePublishChanges: 10,
  assetBudget: { maxBytes: 2000000, maxTriangles: 60000 },
  suggestion: { occupancyBelow: 30, discountPercent: 10 },
});
/** Isolated deterministic world for local demos/tests. Credentials are public
 * fixtures; hashes, PRNG tokens and sessions are deliberately not production auth. */
export function createPilotWorld(
  now = Date.UTC(2026, 10, 16),
  seed = 12345,
  sources: readonly Venue[] = venues,
): World {
  const db: Db = {
    schema: 1,
    seq: 0,
    rng: seed,
    secrets: { webhook: 'demo-only' },
    platformAdmins: [
      {
        id: 'platform',
        name: 'Demo admin',
        email: 'platform@demo.test',
        passwordHash: passwordHash('platform@demo.test', 'demo-password'),
      },
    ],
    platformSessions: [],
    grants: [],
    tenants: [],
    branches: [],
    staff: [],
    staffSessions: [],
    categories: [],
    items: [],
    assets: [
      {
        id: 'desk',
        tenantId: null,
        name: 'Desk',
        kind: 'desk',
        sizeBytes: 1000,
        triangles: 100,
        approved: true,
        version: 1,
        width: 1,
        depth: 1,
        seatSlots: 1,
      },
    ],
    layouts: [],
    locks: [],
    cleaning: [],
    qr: [],
    priceRules: [],
    sales: [],
    vouchers: [],
    suggestions: [],
    quotes: [],
    orders: [],
    payments: [],
    tickets: [],
    outbox: [],
    reservations: [],
    shifts: [],
    refunds: [],
    exceptions: [],
    ledger: [],
    members: [],
    memberSessions: [],
    otps: [],
    points: [],
    deletions: [],
    support: [],
    aiRuns: [],
    audit: [],
    logs: [],
    opsAlerts: [],
    attempts: [],
    rate: {},
    idem: {},
    processedEvents: [],
    faults: { ticketPublishFailures: 0 },
  };
  for (const venue of sources) {
    db.tenants.push({
      id: venue.id,
      name: venue.name,
      status: 'active',
      currency: 'VND',
      brand: {
        displayName: venue.name,
        logoUrl: null,
        primary: venue.accent,
        background: '#ffffff',
        text: '#111111',
      },
      settings: defaultTenantSettings(),
      isTemplate: false,
      createdAt: now,
    });
    const branchId = `${venue.id}-main`;
    const tierId = `${venue.id}-standard`;
    db.branches.push({
      id: branchId,
      tenantId: venue.id,
      slug: venue.id,
      name: venue.name,
      address: 'Demo address',
      timezone: 'Asia/Ho_Chi_Minh',
      utcOffsetMinutes: 420,
      hours: Array.from({ length: 7 }, () => ({
        open: '07:00',
        close: '22:00',
      })),
      closures: [],
      bufferMinutes: 10,
      checkInWindowMinutes: 15,
      policy: { version: 1, text: 'Prepaid seat time. Ask staff for help.' },
      tiers: [
        {
          id: tierId,
          name: 'Standard',
          baseHourlyRate: venue.seats[0]?.hourlyRate ?? 40000,
        },
      ],
    });
    for (const role of ['owner', 'manager', 'cashier', 'server'] as const) {
      const email = `${role}@${venue.id}.demo.test`;
      db.staff.push({
        id: `${venue.id}-${role}`,
        tenantId: venue.id,
        name: `Demo ${role}`,
        email,
        passwordHash: passwordHash(email, 'demo-password'),
        role,
        branchIds: [branchId],
        status: 'active',
        epoch: 1,
      });
    }
    const categoryId = `${venue.id}-menu`;
    db.categories.push({
      id: categoryId,
      tenantId: venue.id,
      name: 'Menu',
      sort: 0,
    });
    db.items.push(
      ...venue.menu.map((item) => ({
        id: `${venue.id}-${item.id}`,
        tenantId: venue.id,
        categoryId,
        kind: 'food_drink' as const,
        name: item.name,
        price: item.price,
        sizes: [],
        modifierGroups: [],
        soldOut: false,
        archived: false,
        limited: false,
      })),
    );
    const doc = {
      version: 1,
      placements: venue.seats.map((seat, n) => ({
        id: `${seat.id}-placement`,
        assetId: 'desk',
        x: 1 + (n % 4) * 2,
        z: 1 + Math.floor(n / 4) * 2,
        rotation: 0,
      })),
      seats: venue.seats.map((seat) => ({
        id: seat.id,
        label: seat.label,
        zoneId: 'main',
        tierId,
        amenities: [],
        placementId: `${seat.id}-placement`,
      })),
      zones: [{ id: 'main', name: 'Main', tierId }],
      updatedBy: null,
      updatedAt: now,
    };
    const layout = {
      branchId,
      tenantId: venue.id,
      floor: { width: 10, depth: 10, grid: 0.5 },
      draft: doc,
      published: JSON.parse(JSON.stringify(doc)) as typeof doc,
      history: [JSON.parse(JSON.stringify(doc)) as typeof doc],
    };
    db.layouts.push(layout);
    syncQr(db, layout);
  }
  return {
    db,
    provider: { seq: 0, down: false, intents: [], events: [] },
    backups: [],
  };
}
