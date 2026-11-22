/** Pilot engine data vocabulary (PRD §6.1). Everything here is plain JSON so a
 * whole `World` can be cloned, persisted and restored. Money is an integer in
 * the tenant currency's smallest unit; timestamps are UTC milliseconds. */

export type Role = 'owner' | 'manager' | 'cashier' | 'server';
export type Ms = number;

export interface DayHours {
  /** Local `HH:MM` in the branch timezone. */
  open: string;
  close: string;
}
export interface Brand {
  displayName: string;
  logoUrl: string | null;
  primary: string;
  background: string;
  text: string;
}
export interface FeeConfig {
  id: string;
  name: string;
  kind: 'percent' | 'fixed';
  /** Basis points for `percent`, currency units for `fixed`. */
  value: number;
  appliesTo: 'all' | 'items' | 'seat';
}
export interface LoyaltyConfig {
  /** Currency spent per point earned. */
  earnPerPoint: number;
  /** Discount value of one point. Points have no cash value. */
  redeemValue: number;
  /** Largest share of an order's subtotal that points may cover. */
  redeemCapPercent: number;
  minOrdersForSuggestion: number;
}
export interface RetentionConfig {
  customerDays: number;
  aiLogDays: number;
  auditDays: number;
}
export interface TenantSettings {
  fees: FeeConfig[];
  loyalty: LoyaltyConfig;
  /** Seat-time packages on sale, in minutes. */
  seatPackages: number[];
  floorHourlyRate: number;
  maxDiscountPercent: number;
  aiEnabled: boolean;
  /** AI call budget and spend, in call units. */
  aiBudget: number;
  aiSpent: number;
  aiConfidenceMin: number;
  retention: RetentionConfig;
  counterPaymentMinutes: number;
  /** A publish touching at least this many records takes a backup first. */
  largePublishChanges: number;
  assetBudget: { maxBytes: number; maxTriangles: number };
  /** Occupancy (percent) under which a sale is suggested, and its discount. */
  suggestion: { occupancyBelow: number; discountPercent: number };
}
export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  currency: 'VND';
  brand: Brand;
  settings: TenantSettings;
  isTemplate: boolean;
  createdAt: Ms;
}
export interface Tier {
  id: string;
  name: string;
  baseHourlyRate: number;
}
export interface Branch {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  address: string;
  timezone: string;
  utcOffsetMinutes: number;
  /** Index 0 is Sunday. `null` means closed that day. */
  hours: (DayHours | null)[];
  closures: { date: string; reason: string }[];
  bufferMinutes: number;
  checkInWindowMinutes: number;
  policy: { version: number; text: string };
  tiers: Tier[];
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  /** Owners reach every branch of the tenant regardless of this list. */
  branchIds: string[];
  status: 'active' | 'revoked';
  /** Bumped to refuse every earlier session. */
  epoch: number;
}
export interface StaffSession {
  token: string;
  staffId: string;
  tenantId: string;
  epoch: number;
  expiresAt: Ms;
}
export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}
export interface PlatformSession {
  token: string;
  adminId: string;
  expiresAt: Ms;
}
export interface SupportGrant {
  id: string;
  tenantId: string;
  adminId: string;
  reason: string;
  createdAt: Ms;
  expiresAt: Ms;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  sort: number;
}
export interface SizeOption {
  id: string;
  name: string;
  price: number;
}
export interface ModifierGroup {
  id: string;
  name: string;
  options: { id: string; name: string; priceDelta: number }[];
}
export interface Item {
  id: string;
  tenantId: string;
  categoryId: string;
  kind: 'food_drink' | 'service';
  name: string;
  /** Used when the item has no sizes. */
  price: number;
  sizes: SizeOption[];
  modifierGroups: ModifierGroup[];
  soldOut: boolean;
  archived: boolean;
  /** A limited service is fulfilled only after staff confirm availability. */
  limited: boolean;
}

export interface AssetDef {
  id: string;
  /** `null` is the shared library. */
  tenantId: string | null;
  name: string;
  kind: 'table' | 'desk' | 'booth' | 'pod' | 'decor';
  sizeBytes: number;
  triangles: number;
  approved: boolean;
  version: number;
  width: number;
  depth: number;
  seatSlots: number;
}
export interface SeatDef {
  id: string;
  label: string;
  zoneId: string;
  tierId: string;
  amenities: string[];
  placementId: string;
}
export interface Placement {
  id: string;
  assetId: string;
  x: number;
  z: number;
  /** Degrees, a multiple of 90. */
  rotation: number;
}
export interface Zone {
  id: string;
  name: string;
  tierId: string;
}
export interface LayoutDoc {
  version: number;
  placements: Placement[];
  seats: SeatDef[];
  zones: Zone[];
  updatedBy: string | null;
  updatedAt: Ms;
}
export interface Layout {
  branchId: string;
  tenantId: string;
  floor: { width: number; depth: number; grid: number };
  draft: LayoutDoc;
  published: LayoutDoc | null;
  history: LayoutDoc[];
}
export interface SeatLock {
  id: string;
  tenantId: string;
  branchId: string;
  seatId: string;
  from: Ms;
  /** `null` is open-ended, until staff unlock. */
  to: Ms | null;
  reason: string;
  by: string;
}

export interface PriceRule {
  id: string;
  tenantId: string;
  branchId: string | null;
  tierId: string | null;
  /** Days of week this rule covers; `null` is every day. */
  days: number[] | null;
  from: string;
  to: string;
  /** Inclusive local dates; `null` is open. */
  validFrom: string | null;
  validTo: string | null;
  hourlyRate: number;
  priority: number;
  status: 'draft' | 'published' | 'archived';
  version: number;
}
export interface FlashSale {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  appliesTo: 'seat' | 'items' | 'all';
  tierIds: string[] | null;
  startAt: Ms;
  endAt: Ms;
  discountPercent: number;
  discountCap: number;
  quota: number;
  held: number;
  used: number;
  status: 'proposed' | 'approved' | 'stopped';
  proposedBy: string;
  approval: {
    by: string;
    reason: string;
    version: number;
    at: Ms;
    validFrom: Ms;
    validTo: Ms;
  } | null;
  suggestionId: string | null;
}
export interface Voucher {
  id: string;
  tenantId: string;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  cap: number;
  validFrom: Ms;
  validTo: Ms;
  usageLimit: number;
  held: number;
  used: number;
}
export interface Suggestion {
  id: string;
  tenantId: string;
  branchId: string;
  kind: 'flash_sale';
  source: 'rules' | 'ai';
  explanation: string;
  payload: {
    name: string;
    appliesTo: FlashSale['appliesTo'];
    tierIds: string[] | null;
    startAt: Ms;
    endAt: Ms;
    discountPercent: number;
    discountCap: number;
    quota: number;
  };
  status: 'generated' | 'approved' | 'rejected' | 'expired';
  createdAt: Ms;
  expiresAt: Ms;
  decidedBy: string | null;
  decisionReason: string | null;
  aiRunId: string | null;
}

export interface PriceSegment {
  from: Ms;
  to: Ms;
  minutes: number;
  hourlyRate: number;
  ruleId: string | null;
}
export interface OrderLine {
  id: string;
  kind: 'item' | 'seat' | 'extension';
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemId?: string;
  categoryId?: string;
  sizeId?: string;
  sizeName?: string;
  modifiers?: {
    groupId: string;
    optionId: string;
    name: string;
    priceDelta: number;
  }[];
  note?: string;
  limited?: boolean;
  seatId?: string;
  seatLabel?: string;
  tierId?: string;
  startAt?: Ms;
  endAt?: Ms;
  minutes?: number;
  walkIn?: boolean;
  segments?: PriceSegment[];
  /** The booking this line created, or extends. */
  reservationId?: string;
}
export interface AppliedPromotion {
  kind: 'flash_sale' | 'voucher' | 'points';
  refId: string;
  label: string;
  amount: number;
  points?: number;
}
export interface FeeLine {
  feeId: string;
  name: string;
  amount: number;
}
export interface Actor {
  kind: 'guest' | 'member' | 'staff' | 'platform' | 'system';
  id: string;
  name?: string;
}
export interface Quote {
  id: string;
  tenantId: string;
  branchId: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  promotion: AppliedPromotion | null;
  fees: FeeLine[];
  total: number;
  createdAt: Ms;
  expiresAt: Ms;
  used: boolean;
  channel: 'customer' | 'counter';
  createdBy: Actor;
  memberId: string | null;
  deliverTo: { seatId: string; seatLabel: string } | null;
  sessionRef: string | null;
  policy: { version: number; text: string } | null;
}
export type OrderStatus =
  'draft' | 'awaiting_payment' | 'paid' | 'completed' | 'cancelled';
export interface Order {
  id: string;
  code: string;
  tenantId: string;
  branchId: string;
  quoteId: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  promotion: AppliedPromotion | null;
  fees: FeeLine[];
  total: number;
  status: OrderStatus;
  history: { status: OrderStatus; at: Ms }[];
  paidAmount: number;
  refundedAmount: number;
  channel: 'customer' | 'counter';
  createdBy: Actor;
  memberId: string | null;
  /** Guest order token (F101): unguessable, scoped to this order, expiring. */
  accessToken: string;
  accessExpiresAt: Ms;
  payAtCounter: boolean;
  paymentDeadline: Ms;
  deliverTo: { seatId: string; seatLabel: string } | null;
  sessionRef: string | null;
  correlationId: string;
  staffAssist: { by: string; reason: string } | null;
  cancelReason: string | null;
  notices: string[];
  createdAt: Ms;
  paidAt: Ms | null;
  completedAt: Ms | null;
}
export type PaymentStatus =
  'initiated' | 'pending' | 'succeeded' | 'failed' | 'expired';
export interface Payment {
  id: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  method: 'online' | 'cash';
  amount: number;
  currency: 'VND';
  status: PaymentStatus;
  intentId: string | null;
  shiftId: string | null;
  confirmedBy: string | null;
  tendered: number | null;
  /** True when the money was collected but the order was already settled. */
  excess: boolean;
  correlationId: string;
  createdAt: Ms;
  updatedAt: Ms;
  evidence: { at: Ms; source: string; note: string }[];
  /** Optional for schema-1 compatibility with earlier cash-only records. */
  gateway?: {
    provider: 'vnpay';
    expiresAt: Ms;
    lastQueryAt: Ms | null;
    transactionId: string | null;
  };
}
export type TicketStatus =
  'queued' | 'preparing' | 'ready' | 'served' | 'cancelled';
export interface Ticket {
  id: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  orderCode: string;
  destination: string;
  lines: {
    name: string;
    quantity: number;
    detail: string;
    note: string;
    limited: boolean;
    confirmed: boolean;
  }[];
  status: TicketStatus;
  history: { status: TicketStatus; at: Ms; by: string }[];
  cancelReason: string | null;
  createdAt: Ms;
}
export interface OutboxEvent {
  id: string;
  type: 'order.paid';
  orderId: string;
  attempts: number;
  status: 'pending' | 'done';
  lastError: string | null;
}

export type ReservationStatus =
  | 'held'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'no_show';
export interface Reservation {
  id: string;
  /** Booking code the customer keeps (F242). */
  code: string;
  tenantId: string;
  branchId: string;
  seatId: string;
  tierId: string;
  startAt: Ms;
  endAt: Ms;
  status: ReservationStatus;
  /** `extension` rows hold the slot after a booking while its extension is paid. */
  kind: 'booking' | 'extension';
  parentId: string | null;
  holdExpiresAt: Ms;
  orderId: string;
  walkIn: boolean;
  awaitingHandover: boolean;
  checkedInAt: Ms | null;
  endedAt: Ms | null;
  overtimeFlaggedAt: Ms | null;
  noShowAt: Ms | null;
  policy: { version: number; text: string };
  paid: number;
  corrections: {
    by: string;
    reason: string;
    at: Ms;
    field: string;
    from: Ms | null;
    to: Ms;
  }[];
  notes: { by: string; text: string; at: Ms }[];
  createdBy: Actor;
  createdAt: Ms;
}

export interface Shift {
  id: string;
  tenantId: string;
  branchId: string;
  cashierId: string;
  openedAt: Ms;
  openingFloat: number;
  status: 'open' | 'closed';
  closedAt: Ms | null;
  countedCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  /** Payments still in flight when the shift closed (F094). */
  pendingPaymentIds: string[];
}
export type RefundStatus =
  'requested' | 'approved' | 'processing' | 'succeeded' | 'failed' | 'declined';
export interface Refund {
  id: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  source:
    | 'customer'
    | 'staff'
    | 'cancellation'
    | 'excess_payment'
    | 'late_payment'
    | 'unavailable';
  reason: string;
  status: RefundStatus;
  /** Zero until a manager approves an amount. */
  amount: number;
  lines: { lineId: string; amount: number }[];
  requestedBy: Actor;
  approvedBy: string | null;
  method: 'gateway' | 'manual' | 'cash' | null;
  evidence: string | null;
  confirmedBy: string | null;
  paymentId: string | null;
  providerRefundId: string | null;
  shiftId: string | null;
  createdAt: Ms;
  updatedAt: Ms;
}
export interface MoneyException {
  id: string;
  tenantId: string;
  branchId: string;
  kind:
    | 'excess_payment'
    | 'late_payment'
    | 'pending_payment'
    | 'unmatched_provider';
  orderId: string | null;
  paymentId: string | null;
  evidence: string;
  status: 'open' | 'resolved';
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: Ms;
}
/** Adjustment entries: paid orders are never edited, money moves are appended. */
export interface LedgerEntry {
  id: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  type: 'payment' | 'refund';
  method: 'online' | 'cash' | 'manual';
  amount: number;
  refId: string;
  shiftId: string | null;
  at: Ms;
}

export interface Member {
  id: string;
  tenantId: string;
  /** Removed (`null`) when a deletion request is processed. */
  phone: string | null;
  name: string | null;
  status: 'active' | 'left' | 'deleted';
  consent: { at: Ms; policyVersion: number };
  joinedAt: Ms;
}
export interface MemberSession {
  token: string;
  memberId: string;
  tenantId: string;
  expiresAt: Ms;
}
export interface OtpChallenge {
  id: string;
  tenantId: string;
  phone: string;
  code: string;
  expiresAt: Ms;
  attempts: number;
  used: boolean;
}
export interface PointEntry {
  id: string;
  tenantId: string;
  memberId: string;
  orderId: string | null;
  kind: 'earn' | 'redeem' | 'reverse_earn' | 'return_redeem' | 'adjust';
  /** Signed. */
  points: number;
  status: 'pending' | 'available' | 'held' | 'released';
  note: string;
  at: Ms;
}
export interface DeletionRequest {
  id: string;
  tenantId: string;
  memberId: string;
  status: 'requested' | 'processed';
  requestedAt: Ms;
  processedBy: string | null;
}

export type SupportCategory =
  | 'call_staff'
  | 'allergy'
  | 'payment'
  | 'refund'
  | 'booking'
  | 'safety'
  | 'equipment'
  | 'cleaning'
  | 'order'
  | 'other';
export type SupportPriority = 'urgent' | 'normal' | 'low';
export interface Classification {
  category: SupportCategory;
  needs_staff: boolean;
  priority: SupportPriority;
  reason_code: string;
  confidence: number;
}
export interface SupportRequest {
  id: string;
  tenantId: string;
  branchId: string;
  seatId: string | null;
  seatLabel: string | null;
  kind: 'call_staff' | 'note' | 'system';
  text: string;
  classification: Classification;
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: Ms;
  acknowledgedAt: Ms | null;
  resolvedAt: Ms | null;
  handlerId: string | null;
  /** The customer keeps this to read their own requests (F231). */
  ownerToken: string;
  orderId: string | null;
  correlationId: string | null;
  aiRunId: string | null;
}
export interface AiRun {
  id: string;
  tenantId: string;
  kind: 'classify' | 'suggest';
  model: string;
  promptVersion: string;
  /** Input after personal data is removed (F185). */
  input: string;
  output: string;
  validation:
    | 'ok'
    | 'malformed'
    | 'timeout'
    | 'low_confidence'
    | 'skipped_off'
    | 'skipped_budget';
  approverId: string | null;
  correction: {
    by: string;
    category: SupportCategory;
    priority: SupportPriority;
  } | null;
  at: Ms;
}

export interface AuditEvent {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  actor: Actor;
  action: string;
  target: string;
  meta: Record<string, string | number | boolean | null>;
  at: Ms;
}
export interface LogEntry {
  at: Ms;
  event: string;
  correlationId: string | null;
  tenantId: string | null;
  fields: Record<string, unknown>;
}
export interface OpsAlert {
  id: string;
  kind: 'webhook_rejected' | 'job_failing' | 'client_error' | 'api_error';
  message: string;
  at: Ms;
  acknowledged: boolean;
}
export interface CheckoutAttempt {
  orderId: string;
  tenantId: string;
  branchId: string;
  channel: 'customer' | 'counter';
  at: Ms;
  /** Venue-open time reported by the client, for "open to hold" (F195). */
  openedAt: Ms | null;
  hasSeat: boolean;
  outcome:
    | 'pending'
    | 'completed'
    | 'abandoned'
    | 'provider_declined'
    | 'technical_failure';
}
export interface Backup {
  id: string;
  at: Ms;
  reason: string;
  snapshot: string;
}

export interface ProviderIntent {
  id: string;
  orderRef: string;
  amount: number;
  currency: string;
  status: 'created' | 'succeeded' | 'failed';
  createdAt: Ms;
  refunds: { id: string; amount: number; status: 'succeeded' }[];
}
export interface ProviderEvent {
  id: string;
  type: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded';
  intentId: string;
  orderRef: string;
  amount: number;
  currency: string;
  refundId?: string;
  signature: string;
}
/** The payment provider is an external system: backups never contain it. */
export interface Provider {
  seq: number;
  down: boolean;
  intents: ProviderIntent[];
  events: ProviderEvent[];
}

export interface Db {
  schema: 1;
  seq: number;
  rng: number;
  secrets: { webhook: string };
  platformAdmins: PlatformAdmin[];
  platformSessions: PlatformSession[];
  grants: SupportGrant[];
  tenants: Tenant[];
  branches: Branch[];
  staff: Staff[];
  staffSessions: StaffSession[];
  categories: Category[];
  items: Item[];
  assets: AssetDef[];
  layouts: Layout[];
  locks: SeatLock[];
  /** Seats waiting to be marked clean after a session ended. */
  cleaning: { branchId: string; seatId: string; since: Ms }[];
  /** Public seat locators printed as QR codes (F067). */
  qr: { code: string; tenantId: string; branchId: string; seatId: string }[];
  priceRules: PriceRule[];
  sales: FlashSale[];
  vouchers: Voucher[];
  suggestions: Suggestion[];
  quotes: Quote[];
  orders: Order[];
  payments: Payment[];
  tickets: Ticket[];
  outbox: OutboxEvent[];
  reservations: Reservation[];
  shifts: Shift[];
  refunds: Refund[];
  exceptions: MoneyException[];
  ledger: LedgerEntry[];
  members: Member[];
  memberSessions: MemberSession[];
  otps: OtpChallenge[];
  points: PointEntry[];
  deletions: DeletionRequest[];
  support: SupportRequest[];
  aiRuns: AiRun[];
  audit: AuditEvent[];
  logs: LogEntry[];
  opsAlerts: OpsAlert[];
  attempts: CheckoutAttempt[];
  /** Sliding-window rate limit hits by bucket key (F103). */
  rate: Record<string, Ms[]>;
  idem: Record<string, { hash: string; response: string }>;
  processedEvents: string[];
  faults: { ticketPublishFailures: number };
}
export interface World {
  db: Db;
  provider: Provider;
  backups: Backup[];
}

/** What a caller presents. Tokens are checked on every call. */
export interface Auth {
  staffToken?: string;
  platformToken?: string;
  /** Order/booking access tokens this device holds. */
  accessTokens?: string[];
  memberToken?: string;
  /** Device key used only for rate limiting. */
  clientId?: string;
}
export type AiCall = (
  kind: 'classify' | 'suggest',
  input: string,
) => { output: unknown } | { error: 'timeout' | 'unavailable' };
export interface Deps {
  /** Optional AI adapter. The engine never depends on it succeeding. */
  ai?: AiCall;
  /** Required by the network service; omitted only by deterministic local demos. */
  credentials?: {
    hashPassword: (email: string, password: string) => string;
    verifyPassword: (
      email: string,
      password: string,
      digest: string | undefined,
    ) => boolean;
    newToken: () => string;
    tokenDigest: (token: string) => string;
  };
}
export interface Tx {
  db: Db;
  provider: Provider;
  backups: Backup[];
  now: Ms;
  auth: Auth;
  deps: Deps;
  /** Effects that must survive a refused command (rate hits, alerts, logs). */
  keep: (effect: (db: Db) => void) => void;
}
