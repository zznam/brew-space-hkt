import { fail, must } from './errors';
import type {
  Actor,
  AuditEvent,
  Branch,
  Brand,
  Db,
  Role,
  Staff,
  Tenant,
  Tx,
} from './types';
import { HOUR, MIN, isText, nextId } from './util';
import {
  demoPasswordHash,
  hashPassword,
  verifyPassword,
  newSessionToken,
  sessionDigest,
} from './credentials';

/** PRD §5 matrix. A role absent from a row is refused by the API (F006). */
export const PERMS = {
  'order.staff': ['owner', 'manager', 'cashier'],
  'cash.confirm': ['owner', 'manager', 'cashier'],
  'shift.use': ['owner', 'manager', 'cashier'],
  'booking.manage': ['owner', 'manager', 'cashier'],
  'floor.read': ['owner', 'manager', 'cashier', 'server'],
  'seat.clean': ['owner', 'manager', 'cashier', 'server'],
  'seat.lock': ['owner', 'manager'],
  'ticket.work': ['owner', 'manager', 'cashier', 'server'],
  'ticket.cancel': ['owner', 'manager'],
  'support.work': ['owner', 'manager', 'cashier', 'server'],
  'item.soldout': ['owner', 'manager', 'cashier', 'server'],
  'menu.edit': ['owner', 'manager'],
  'layout.edit': ['owner', 'manager'],
  'pricing.approve': ['owner', 'manager'],
  'pricing.propose': ['owner', 'manager', 'cashier'],
  'refund.approve': ['owner', 'manager'],
  'refund.propose': ['owner', 'manager', 'cashier', 'server'],
  'revenue.read': ['owner', 'manager'],
  'report.export': ['owner', 'manager'],
  'customers.export': ['owner'],
  'tenant.config': ['owner'],
  'staff.manage': ['owner'],
  'session.correct': ['owner', 'manager'],
  'audit.read': ['owner', 'manager'],
} as const satisfies Record<string, readonly Role[]>;
export type Perm = keyof typeof PERMS;
export const can = (role: Role, perm: Perm): boolean =>
  (PERMS[perm] as readonly Role[]).includes(role);

const STAFF_SESSION_MS = 12 * HOUR;
export const passwordHash = demoPasswordHash;

/** Sliding windows (F103). Limits are generous enough that normal use never hits them. */
const RATE = {
  signin: { limit: 5, windowMs: 5 * MIN },
  otp: { limit: 3, windowMs: 10 * MIN },
  checkout: { limit: 12, windowMs: MIN },
  ai: { limit: 30, windowMs: MIN },
  recover: { limit: 5, windowMs: 10 * MIN },
} as const;
export function rateLimit(tx: Tx, bucket: keyof typeof RATE, key: string) {
  const { limit, windowMs } = RATE[bucket];
  const name = `${bucket}:${key}`;
  const since = tx.now - windowMs;
  const hits = (tx.db.rate[name] ?? []).filter((at) => at > since);
  if (hits.length >= limit)
    fail('THROTTLED', 'Too many attempts. Try again shortly.', {
      retryAt: (hits[0] ?? tx.now) + windowMs,
    });
  const now = tx.now;
  tx.keep((db) => {
    db.rate[name] = [...(db.rate[name] ?? []).filter((at) => at > since), now];
  });
}

const SECRET_KEY = /token|otp|code|password|secret|signature|card|pin/i;
/** Removes credentials and payment details before anything is logged (F110). */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
        key,
        SECRET_KEY.test(key) ? '[redacted]' : redact(inner),
      ]),
    );
  return value;
}
const LOG_LIMIT = 2000;
export function log(
  tx: Tx,
  event: string,
  fields: Record<string, unknown>,
  scope: { correlationId?: string | null; tenantId?: string | null } = {},
) {
  const entry = {
    at: tx.now,
    event,
    correlationId: scope.correlationId ?? null,
    tenantId: scope.tenantId ?? null,
    fields: redact(fields) as Record<string, unknown>,
  };
  tx.keep((db) => {
    db.logs.push(entry);
    if (db.logs.length > LOG_LIMIT)
      db.logs.splice(0, db.logs.length - LOG_LIMIT);
  });
}
export function alert(
  tx: Tx,
  kind: Db['opsAlerts'][number]['kind'],
  message: string,
) {
  const at = tx.now;
  tx.keep((db) => {
    db.opsAlerts.push({
      id: nextId(db, 'alr'),
      kind,
      message,
      at,
      acknowledged: false,
    });
  });
}

export const staffActor = (staff: Staff): Actor => ({
  kind: 'staff',
  id: staff.id,
  name: staff.name,
});
export const SYSTEM: Actor = { kind: 'system', id: 'system' };
export function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  target: string,
  scope: {
    tenantId: string | null;
    branchId?: string | null;
    meta?: AuditEvent['meta'];
  },
) {
  tx.db.audit.push({
    id: nextId(tx.db, 'aud'),
    tenantId: scope.tenantId,
    branchId: scope.branchId ?? null,
    actor,
    action,
    target,
    meta: scope.meta ?? {},
    at: tx.now,
  });
}

export const tenantById = (db: Db, id: string): Tenant =>
  must(db.tenants.find((tenant) => tenant.id === id));
export const branchById = (db: Db, id: string): Branch =>
  must(db.branches.find((branch) => branch.id === id));
/** A resource of another tenant is reported as missing, never as forbidden (F008). */
export function owned<T extends { id: string; tenantId: string | null }>(
  list: T[],
  id: string,
  tenantId: string,
): T {
  return must(list.find((row) => row.id === id && row.tenantId === tenantId));
}
export function activeTenant(db: Db, tenantId: string): Tenant {
  const tenant = tenantById(db, tenantId);
  if (tenant.status !== 'active')
    fail('TENANT_SUSPENDED', 'This venue is not taking requests right now.');
  return tenant;
}

/** The signed-in staff member. Checked on every call, so a revoked or expired
 * session is refused at the API and not only hidden in the UI (F005, F009). */
export function staffOf(tx: Tx): Staff {
  const session = tx.auth.staffToken
    ? tx.db.staffSessions.find(
        (row) => row.token === sessionDigest(tx, tx.auth.staffToken!),
      )
    : undefined;
  if (!session || session.expiresAt <= tx.now) fail('UNAUTHENTICATED');
  const staff = tx.db.staff.find((row) => row.id === session.staffId);
  if (!staff || staff.status !== 'active' || staff.epoch !== session.epoch)
    fail('UNAUTHENTICATED');
  activeTenant(tx.db, staff.tenantId);
  return staff;
}
export function requireStaff(tx: Tx, perm: Perm, branchId?: string): Staff {
  const staff = staffOf(tx);
  if (branchId !== undefined) {
    const branch = tx.db.branches.find((row) => row.id === branchId);
    if (!branch || branch.tenantId !== staff.tenantId) fail('NOT_FOUND');
    if (staff.role !== 'owner' && !staff.branchIds.includes(branchId))
      fail('FORBIDDEN', 'You are not assigned to this branch.');
  }
  if (!can(staff.role, perm))
    fail('FORBIDDEN', 'Your role does not allow this.');
  return staff;
}
export const staffBranchIds = (db: Db, staff: Staff): string[] =>
  staff.role === 'owner'
    ? db.branches.filter((b) => b.tenantId === staff.tenantId).map((b) => b.id)
    : staff.branchIds;
/** Optional staff: `null` when the caller presents no staff token. */
export const staffIfAny = (tx: Tx): Staff | null =>
  tx.auth.staffToken ? staffOf(tx) : null;

function platformOf(tx: Tx) {
  const session = tx.auth.platformToken
    ? tx.db.platformSessions.find(
        (row) => row.token === sessionDigest(tx, tx.auth.platformToken!),
      )
    : undefined;
  if (!session || session.expiresAt <= tx.now) fail('UNAUTHENTICATED');
  return must(
    tx.db.platformAdmins.find((row) => row.id === session.adminId),
    'UNAUTHENTICATED',
  );
}

const profile = (db: Db, staff: Staff) => ({
  id: staff.id,
  tenantId: staff.tenantId,
  name: staff.name,
  email: staff.email,
  role: staff.role,
  status: staff.status,
  branchIds: staffBranchIds(db, staff),
});

// ── Staff sign-in and management ────────────────────────────────────────────

export function staffSignIn(
  tx: Tx,
  input: { email: string; password: string },
) {
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  rateLimit(tx, 'signin', email);
  const staff = tx.db.staff.find((row) => row.email === email);
  log(tx, 'staff.signin', { email, password: input.password });
  const valid = verifyPassword(
    tx,
    email,
    String(input.password ?? ''),
    staff?.passwordHash,
  );
  if (!staff || staff.status !== 'active' || !valid)
    fail('UNAUTHENTICATED', 'Email or password is wrong.');
  activeTenant(tx.db, staff.tenantId);
  const rawToken = newSessionToken(tx);
  const session = {
    token: sessionDigest(tx, rawToken),
    staffId: staff.id,
    tenantId: staff.tenantId,
    epoch: staff.epoch,
    expiresAt: tx.now + STAFF_SESSION_MS,
  };
  tx.db.staffSessions.push(session);
  return {
    token: rawToken,
    expiresAt: session.expiresAt,
    staff: profile(tx.db, staff),
  };
}
export function staffSignOut(tx: Tx) {
  staffOf(tx);
  tx.db.staffSessions = tx.db.staffSessions.filter(
    (row) => row.token !== sessionDigest(tx, tx.auth.staffToken!),
  );
  return { signedOut: true };
}
export function me(tx: Tx) {
  const staff = staffOf(tx);
  const tenant = tenantById(tx.db, staff.tenantId);
  return {
    staff: profile(tx.db, staff),
    tenant: { id: tenant.id, name: tenant.name, brand: tenant.brand },
    branches: staffBranchIds(tx.db, staff).map((id) => {
      const branch = branchById(tx.db, id);
      return { id, name: branch.name, slug: branch.slug };
    }),
    perms: (Object.keys(PERMS) as Perm[]).filter((perm) =>
      can(staff.role, perm),
    ),
  };
}

const ROLES: Role[] = ['owner', 'manager', 'cashier', 'server'];
function checkAssignment(
  tx: Tx,
  owner: Staff,
  role: Role,
  branchIds: string[],
) {
  if (!ROLES.includes(role)) fail('VALIDATION', 'Unknown role.');
  if (!Array.isArray(branchIds)) fail('VALIDATION', 'Choose branches.');
  for (const id of branchIds) owned(tx.db.branches, id, owner.tenantId);
  if (role !== 'owner' && branchIds.length === 0)
    fail('VALIDATION', 'Assign at least one branch.');
}
export function inviteStaff(
  tx: Tx,
  input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    branchIds: string[];
  },
) {
  const owner = requireStaff(tx, 'staff.manage');
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  if (!isText(input.name, 80) || !/^\S+@\S+\.\S+$/.test(email))
    fail('VALIDATION', 'Enter a name and a valid email.');
  if (!isText(input.password, 100) || input.password.length < 8)
    fail('VALIDATION', 'Use a password of at least 8 characters.');
  if (tx.db.staff.some((row) => row.email === email))
    fail('VALIDATION', 'That email is already in use.');
  checkAssignment(tx, owner, input.role, input.branchIds);
  const staff: Staff = {
    id: nextId(tx.db, 'stf'),
    tenantId: owner.tenantId,
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(tx, email, input.password),
    role: input.role,
    branchIds: [...input.branchIds],
    status: 'active',
    epoch: 1,
  };
  tx.db.staff.push(staff);
  audit(tx, staffActor(owner), 'staff.invite', staff.id, {
    tenantId: owner.tenantId,
    meta: { role: staff.role, branches: staff.branchIds.join(',') },
  });
  return profile(tx.db, staff);
}
export function updateStaff(
  tx: Tx,
  input: { staffId: string; role: Role; branchIds: string[] },
) {
  const owner = requireStaff(tx, 'staff.manage');
  const staff = owned(tx.db.staff, input.staffId, owner.tenantId);
  checkAssignment(tx, owner, input.role, input.branchIds);
  if (
    staff.role === 'owner' &&
    input.role !== 'owner' &&
    !tx.db.staff.some(
      (row) =>
        row.tenantId === owner.tenantId &&
        row.id !== staff.id &&
        row.role === 'owner' &&
        row.status === 'active',
    )
  )
    fail('VALIDATION', 'Keep at least one active owner.');
  staff.role = input.role;
  staff.branchIds = [...input.branchIds];
  audit(tx, staffActor(owner), 'staff.assign', staff.id, {
    tenantId: owner.tenantId,
    meta: { role: staff.role, branches: staff.branchIds.join(',') },
  });
  return profile(tx.db, staff);
}
export function revokeStaff(tx: Tx, input: { staffId: string }) {
  const owner = requireStaff(tx, 'staff.manage');
  const staff = owned(tx.db.staff, input.staffId, owner.tenantId);
  if (staff.id === owner.id) fail('VALIDATION', 'You cannot revoke yourself.');
  staff.status = 'revoked';
  staff.epoch += 1;
  audit(tx, staffActor(owner), 'staff.revoke', staff.id, {
    tenantId: owner.tenantId,
  });
  return profile(tx.db, staff);
}
/** Reset signs the person out everywhere: earlier sessions carry an old epoch (F106). */
export function resetStaffPassword(
  tx: Tx,
  input: { staffId: string; password: string },
) {
  const owner = requireStaff(tx, 'staff.manage');
  const staff = owned(tx.db.staff, input.staffId, owner.tenantId);
  if (!isText(input.password, 100) || input.password.length < 8)
    fail('VALIDATION', 'Use a password of at least 8 characters.');
  staff.passwordHash = hashPassword(tx, staff.email, input.password);
  staff.epoch += 1;
  audit(tx, staffActor(owner), 'staff.password_reset', staff.id, {
    tenantId: owner.tenantId,
  });
  return { reset: true };
}
export function listStaff(tx: Tx) {
  const owner = requireStaff(tx, 'staff.manage');
  return tx.db.staff
    .filter((row) => row.tenantId === owner.tenantId)
    .map((row) => profile(tx.db, row));
}

// ── Tenant configuration ────────────────────────────────────────────────────

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
const luminance = (hex: string) => {
  const channel = (at: number) => {
    const v = parseInt(hex.slice(at, at + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
};
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}
/** Only checked values are stored: no markup, script URLs or unknown keys (F003). */
export function validateBrand(input: unknown): Brand {
  if (!input || typeof input !== 'object')
    fail('VALIDATION', 'Brand is missing.');
  const brand = input as Record<string, unknown>;
  const allowed = ['displayName', 'logoUrl', 'primary', 'background', 'text'];
  if (Object.keys(brand).some((key) => !allowed.includes(key)))
    fail('VALIDATION', 'Brand has a field that is not allowed.');
  const { displayName, logoUrl, primary, background, text } = brand;
  if (!isText(displayName, 60) || /[<>{}]/.test(displayName))
    fail('VALIDATION', 'Use a plain name of up to 60 characters.');
  if (
    logoUrl !== null &&
    (typeof logoUrl !== 'string' ||
      !/^https:\/\/[\w.-]+\/[\w./%-]+\.(png|jpe?g|webp)$/i.test(logoUrl))
  )
    fail('VALIDATION', 'Logo must be an https link to a PNG, JPEG or WebP.');
  for (const colour of [primary, background, text])
    if (typeof colour !== 'string' || !HEX_COLOUR.test(colour))
      fail('VALIDATION', 'Colours must look like #1a2b3c.');
  if (contrastRatio(text as string, background as string) < 4.5)
    fail('VALIDATION', 'Text is too hard to read on that background.');
  return {
    displayName: displayName.trim(),
    logoUrl: logoUrl as string | null,
    primary: primary as string,
    background: background as string,
    text: text as string,
  };
}
export function updateBrand(tx: Tx, input: { brand: unknown }) {
  const owner = requireStaff(tx, 'tenant.config');
  const tenant = tenantById(tx.db, owner.tenantId);
  tenant.brand = validateBrand(input.brand);
  audit(tx, staffActor(owner), 'brand.update', tenant.id, {
    tenantId: tenant.id,
  });
  return tenant.brand;
}

// ── Platform admin ──────────────────────────────────────────────────────────

export function platformSignIn(
  tx: Tx,
  input: { email: string; password: string },
) {
  const email = String(input.email ?? '')
    .trim()
    .toLowerCase();
  rateLimit(tx, 'signin', `platform:${email}`);
  const admin = tx.db.platformAdmins.find((row) => row.email === email);
  const valid = verifyPassword(
    tx,
    email,
    String(input.password ?? ''),
    admin?.passwordHash,
  );
  if (!admin || !valid) fail('UNAUTHENTICATED', 'Email or password is wrong.');
  const rawToken = newSessionToken(tx);
  const session = {
    token: sessionDigest(tx, rawToken),
    adminId: admin.id,
    expiresAt: tx.now + 2 * HOUR,
  };
  tx.db.platformSessions.push(session);
  return { token: rawToken, expiresAt: session.expiresAt };
}
export function platformSignOut(tx: Tx) {
  platformOf(tx);
  tx.db.platformSessions = tx.db.platformSessions.filter(
    (row) => row.token !== sessionDigest(tx, tx.auth.platformToken!),
  );
  return { signedOut: true };
}
/** Platform admins see which tenants exist, never their business data. */
export function listTenants(tx: Tx) {
  platformOf(tx);
  return tx.db.tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    status: tenant.status,
    isTemplate: tenant.isTemplate,
  }));
}
export function setTenantStatus(
  tx: Tx,
  input: { tenantId: string; status: 'active' | 'suspended'; reason: string },
) {
  const admin = platformOf(tx);
  const tenant = tenantById(tx.db, input.tenantId);
  if (!isText(input.reason)) fail('VALIDATION', 'Give a reason.');
  if (input.status !== 'active' && input.status !== 'suspended')
    fail('VALIDATION', 'Unknown status.');
  tenant.status = input.status;
  audit(
    tx,
    { kind: 'platform', id: admin.id, name: admin.name },
    `tenant.${input.status === 'active' ? 'reactivate' : 'suspend'}`,
    tenant.id,
    { tenantId: tenant.id, meta: { reason: input.reason } },
  );
  return { id: tenant.id, status: tenant.status };
}
export function setAiBudget(
  tx: Tx,
  input: { tenantId: string; budget: number },
) {
  const admin = platformOf(tx);
  const tenant = tenantById(tx.db, input.tenantId);
  if (!Number.isSafeInteger(input.budget) || input.budget < 0)
    fail('VALIDATION', 'Budget must be a whole number.');
  tenant.settings.aiBudget = input.budget;
  audit(tx, { kind: 'platform', id: admin.id }, 'ai.budget', tenant.id, {
    tenantId: tenant.id,
    meta: { budget: input.budget },
  });
  return { budget: tenant.settings.aiBudget, spent: tenant.settings.aiSpent };
}
export function createSupportGrant(
  tx: Tx,
  input: { tenantId: string; reason: string; minutes: number },
) {
  const admin = platformOf(tx);
  const tenant = tenantById(tx.db, input.tenantId);
  if (!isText(input.reason)) fail('VALIDATION', 'A grant needs a reason.');
  if (
    !Number.isSafeInteger(input.minutes) ||
    input.minutes < 5 ||
    input.minutes > 480
  )
    fail('VALIDATION', 'A grant lasts between 5 minutes and 8 hours.');
  const grant = {
    id: nextId(tx.db, 'grt'),
    tenantId: tenant.id,
    adminId: admin.id,
    reason: input.reason.trim(),
    createdAt: tx.now,
    expiresAt: tx.now + input.minutes * MIN,
  };
  tx.db.grants.push(grant);
  audit(
    tx,
    { kind: 'platform', id: admin.id, name: admin.name },
    'support_grant.create',
    grant.id,
    {
      tenantId: tenant.id,
      meta: { reason: grant.reason, expiresAt: grant.expiresAt },
    },
  );
  return grant;
}
/** Business data is readable only under a live grant, and every read is audited (F104). */
export function platformReadTenant(tx: Tx, input: { tenantId: string }) {
  const admin = platformOf(tx);
  const grant = tx.db.grants.find(
    (row) =>
      row.tenantId === input.tenantId &&
      row.adminId === admin.id &&
      row.expiresAt > tx.now,
  );
  if (!grant) fail('FORBIDDEN', 'No active support grant for this tenant.');
  audit(
    tx,
    { kind: 'platform', id: admin.id, name: admin.name },
    'support_grant.read',
    grant.id,
    {
      tenantId: input.tenantId,
    },
  );
  const inTenant = <T extends { tenantId: string }>(rows: T[]) =>
    rows.filter((row) => row.tenantId === input.tenantId);
  return {
    grantId: grant.id,
    expiresAt: grant.expiresAt,
    orders: inTenant(tx.db.orders).map((order) => ({
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
    })),
    openExceptions: inTenant(tx.db.exceptions).filter(
      (e) => e.status === 'open',
    ).length,
    pendingPayments: inTenant(tx.db.payments).filter(
      (p) => p.status === 'pending',
    ).length,
  };
}

// ── Audit and retention ─────────────────────────────────────────────────────

/** Owners see the tenant; managers only their branches (F112). */
export function listAudit(
  tx: Tx,
  input: { actorId?: string; action?: string; from?: number; to?: number } = {},
) {
  const staff = requireStaff(tx, 'audit.read');
  const branches = staffBranchIds(tx.db, staff);
  return tx.db.audit
    .filter(
      (event) =>
        event.tenantId === staff.tenantId &&
        (staff.role === 'owner' ||
          (event.branchId !== null && branches.includes(event.branchId))) &&
        (!input.actorId || event.actor.id === input.actorId) &&
        (!input.action || event.action.startsWith(input.action)) &&
        (input.from === undefined || event.at >= input.from) &&
        (input.to === undefined || event.at <= input.to),
    )
    .sort((a, b) => b.at - a.at);
}
export function setRetention(
  tx: Tx,
  input: { customerDays: number; aiLogDays: number; auditDays: number },
) {
  const owner = requireStaff(tx, 'tenant.config');
  for (const days of [input.customerDays, input.aiLogDays, input.auditDays])
    if (!Number.isSafeInteger(days) || days < 1 || days > 3650)
      fail('VALIDATION', 'Retention is between 1 and 3650 days.');
  const tenant = tenantById(tx.db, owner.tenantId);
  tenant.settings.retention = {
    customerDays: input.customerDays,
    aiLogDays: input.aiLogDays,
    auditDays: input.auditDays,
  };
  audit(tx, staffActor(owner), 'retention.update', tenant.id, {
    tenantId: tenant.id,
    meta: { ...tenant.settings.retention },
  });
  return tenant.settings.retention;
}
export function listOpsAlerts(tx: Tx) {
  platformOf(tx);
  return [...tx.db.opsAlerts].sort((a, b) => b.at - a.at);
}
/** Clients report unhandled errors here so the on-call person is alerted (F191). */
export function reportClientError(tx: Tx, input: { message: string }) {
  alert(
    tx,
    'client_error',
    String(input.message ?? 'Unknown error').slice(0, 300),
  );
  return { reported: true };
}
export { platformOf };
