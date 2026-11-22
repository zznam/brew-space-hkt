import { describe, expect, it } from 'vitest';
import {
  createPilotEngine,
  createPilotWorld,
  type Reply,
} from '../src/core/pilot';
import { calculateLineTotal } from '../src/core/billing';
import { callAi } from '../src/core/pilot/ai';
import type { Auth, Tx } from '../src/core/pilot/types';
import { HOUR } from '../src/core/pilot/util';

function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(`${reply.error.code}: ${reply.error.message}`);
  return reply.data;
}
function setup() {
  let now = Date.UTC(2026, 10, 16, 3);
  const world = createPilotWorld(now);
  const engine = createPilotEngine(world, {}, () => now);
  const tenant = world.db.tenants[0]!;
  const other = world.db.tenants[1]!;
  const branch = world.db.branches[0]!;
  const auth = (role: string, tenantId = tenant.id): Auth => ({
    staffToken: data(
      engine.execute('staffSignIn', {
        email: `${role}@${tenantId}.demo.test`,
        password: 'demo-password',
      }),
    ).token,
  });
  const categoryId = world.db.categories[0]!.id;
  const item = {
    categoryId,
    name: 'Tea',
    kind: 'food_drink' as const,
    price: 30000,
    sizes: [
      { id: 's', name: 'Small', price: 30000 },
      { id: 'l', name: 'Large', price: 40000 },
    ],
    modifierGroups: [
      {
        id: 'milk',
        name: 'Milk',
        options: [{ id: 'oat', name: 'Oat', priceDelta: 5000 }],
      },
    ],
    limited: false,
  };
  return {
    engine,
    world,
    tenant,
    other,
    branch,
    auth,
    item,
    advance: (hours: number) => {
      now += hours * HOUR;
    },
  };
}

describe('pilot access commands (local prototype)', () => {
  it('F005 refuses missing/expired sessions and signs out', () => {
    const s = setup();
    expect(s.engine.execute('me', undefined)).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    });
    const auth = s.auth('cashier');
    expect(data(s.engine.execute('me', undefined, auth)).staff.role).toBe(
      'cashier',
    );
    data(s.engine.execute('staffSignOut', undefined, auth));
    expect(s.engine.execute('me', undefined, auth).ok).toBe(false);
    const second = s.auth('cashier');
    s.advance(12);
    expect(s.engine.execute('me', undefined, second)).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    });
  });
  it('F009 revocation and password reset invalidate existing sessions', () => {
    const s = setup();
    const owner = s.auth('owner');
    const server = s.auth('server');
    data(
      s.engine.execute(
        'revokeStaff',
        { staffId: `${s.tenant.id}-server` },
        owner,
      ),
    );
    expect(s.engine.execute('me', undefined, server).ok).toBe(false);
    const manager = s.auth('manager');
    data(
      s.engine.execute(
        'resetStaffPassword',
        { staffId: `${s.tenant.id}-manager`, password: 'new-password' },
        owner,
      ),
    );
    expect(s.engine.execute('me', undefined, manager).ok).toBe(false);
    expect(
      s.engine.execute('staffSignIn', {
        email: `manager@${s.tenant.id}.demo.test`,
        password: 'demo-password',
      }).ok,
    ).toBe(false);
  });
  it('F007/F008 refuses foreign branches and tenant resources', () => {
    const s = setup();
    const manager = s.auth('manager');
    expect(
      s.engine.execute(
        'getLayout',
        { branchId: `${s.other.id}-main` },
        manager,
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(
      s.engine.execute(
        'archiveItem',
        { itemId: s.world.db.items.find((i) => i.tenantId === s.other.id)!.id },
        manager,
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const extra = structuredClone(s.branch);
    extra.id = 'other-branch';
    s.world.db.branches.push(extra);
    const restricted = createPilotEngine(s.world);
    const token = data(
      restricted.execute('staffSignIn', {
        email: `manager@${s.tenant.id}.demo.test`,
        password: 'demo-password',
      }),
    ).token;
    expect(
      restricted.execute(
        'getLayout',
        { branchId: extra.id },
        { staffToken: token },
      ),
    ).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });
  it('F103/F110 preserves failed login rate hits and redacts passwords', () => {
    const s = setup();
    const input = { email: 'nobody@demo.test', password: 'private-value' };
    for (let i = 0; i < 5; i++)
      expect(s.engine.execute('staffSignIn', input)).toMatchObject({
        ok: false,
        error: { code: 'UNAUTHENTICATED' },
      });
    expect(s.engine.execute('staffSignIn', input)).toMatchObject({
      ok: false,
      error: { code: 'THROTTLED' },
    });
    expect(JSON.stringify(s.engine.snapshot().db.logs)).not.toContain(
      input.password,
    );
    s.advance(1);
    expect(s.engine.execute('staffSignIn', input)).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHENTICATED' },
    });
  });
  it('F003 rejects markup, unknown fields and unreadable branding without mutation', () => {
    const s = setup();
    const owner = s.auth('owner');
    const brand = s.tenant.brand;
    for (const invalid of [
      { ...brand, displayName: '<script>' },
      { ...brand, text: brand.background },
      { ...brand, css: 'body{}' },
    ]) {
      expect(
        s.engine.execute('updateBrand', { brand: invalid }, owner),
      ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    }
    expect(s.engine.snapshot().db.tenants[0]!.brand).toEqual(brand);
  });
  it('F104 requires an expiring audited platform support grant', () => {
    const s = setup();
    const platformToken = data(
      s.engine.execute('platformSignIn', {
        email: 'platform@demo.test',
        password: 'demo-password',
      }),
    ).token;
    const auth = { platformToken };
    expect(
      s.engine.execute('platformReadTenant', { tenantId: s.tenant.id }, auth)
        .ok,
    ).toBe(false);
    data(
      s.engine.execute(
        'createSupportGrant',
        { tenantId: s.tenant.id, reason: 'Investigate demo', minutes: 5 },
        auth,
      ),
    );
    data(
      s.engine.execute('platformReadTenant', { tenantId: s.tenant.id }, auth),
    );
    expect(
      s.engine
        .snapshot()
        .db.audit.some((a) => a.action === 'support_grant.read'),
    ).toBe(true);
    s.advance(1);
    expect(
      s.engine.execute('platformReadTenant', { tenantId: s.tenant.id }, auth)
        .ok,
    ).toBe(false);
  });
  it('F105 suspension blocks staff sessions and public menus', () => {
    const s = setup();
    const manager = s.auth('manager');
    const platformToken = data(
      s.engine.execute('platformSignIn', {
        email: 'platform@demo.test',
        password: 'demo-password',
      }),
    ).token;
    data(
      s.engine.execute(
        'setTenantStatus',
        { tenantId: s.tenant.id, status: 'suspended', reason: 'Pause demo' },
        { platformToken },
      ),
    );
    expect(s.engine.execute('me', undefined, manager)).toMatchObject({
      ok: false,
      error: { code: 'TENANT_SUSPENDED' },
    });
    expect(
      s.engine.execute('publicVenue', { slug: s.branch.slug }),
    ).toMatchObject({ ok: false, error: { code: 'TENANT_SUSPENDED' } });
  });
});

describe('catalogue commands', () => {
  it('F010 manager creates, updates and archives; cashier cannot edit', () => {
    const s = setup();
    const manager = s.auth('manager');
    const cashier = s.auth('cashier');
    const category = data(
      s.engine.execute('saveCategory', { name: 'Tea', sort: 2 }, manager),
    );
    const row = data(
      s.engine.execute(
        'saveItem',
        { ...s.item, categoryId: category.id },
        manager,
      ),
    );
    expect(s.engine.execute('saveItem', s.item, cashier)).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    data(
      s.engine.execute(
        'saveItem',
        { ...s.item, id: row.id, name: 'Green tea' },
        manager,
      ),
    );
    expect(
      data(s.engine.execute('getCatalogue', undefined, manager)).items.find(
        (i) => i.id === row.id,
      )?.name,
    ).toBe('Green tea');
    data(s.engine.execute('archiveItem', { itemId: row.id }, manager));
    expect(
      data(s.engine.execute('publicVenue', { slug: s.branch.slug })).items.some(
        (i) => i.id === row.id,
      ),
    ).toBe(false);
  });
  it('F011 snapshots size, modifiers and quantity; editing menu leaves previews unchanged', () => {
    const s = setup();
    const manager = s.auth('manager');
    const item = data(s.engine.execute('saveItem', s.item, manager));
    const line = data(
      s.engine.execute('snapshotItem', {
        branchId: s.branch.id,
        itemId: item.id,
        sizeId: 'l',
        quantity: 2,
        modifiers: [{ groupId: 'milk', optionId: 'oat' }],
        note: ' No ice ',
      }),
    );
    expect(line).toMatchObject({
      sizeId: 'l',
      sizeName: 'Large',
      unitPrice: 45000,
      lineTotal: 90000,
      note: 'No ice',
    });
    data(
      s.engine.execute(
        'saveItem',
        {
          ...s.item,
          id: item.id,
          sizes: [{ id: 'l', name: 'Large', price: 60000 }],
        },
        manager,
      ),
    );
    expect(line.lineTotal).toBe(90000);
  });
  it('F012 sold-out is enforced on every new line and restored immediately', () => {
    const s = setup();
    const item = s.world.db.items[0]!;
    const server = s.auth('server');
    data(
      s.engine.execute(
        'setSoldOut',
        { itemId: item.id, soldOut: true },
        server,
      ),
    );
    expect(
      s.engine.execute('snapshotItem', {
        branchId: s.branch.id,
        itemId: item.id,
        quantity: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: 'ITEM_UNAVAILABLE' } });
    expect(
      data(s.engine.execute('publicVenue', { slug: s.branch.slug })).items.some(
        (i) => i.id === item.id,
      ),
    ).toBe(false);
    data(
      s.engine.execute(
        'setSoldOut',
        { itemId: item.id, soldOut: false },
        server,
      ),
    );
    expect(
      s.engine.execute('snapshotItem', {
        branchId: s.branch.id,
        itemId: item.id,
        quantity: 1,
      }).ok,
    ).toBe(true);
    expect(
      s.engine.execute('archiveItem', { itemId: item.id }, server).ok,
    ).toBe(false);
  });
  it.each([0, -1, 1.5, 100, NaN])('refuses invalid quantity %s', (quantity) => {
    const s = setup();
    expect(
      s.engine.execute('snapshotItem', {
        branchId: s.branch.id,
        itemId: s.world.db.items[0]!.id,
        quantity,
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });
  it('refuses missing sizes, unknown/duplicate modifiers and foreign categories', () => {
    const s = setup();
    const manager = s.auth('manager');
    const item = data(s.engine.execute('saveItem', s.item, manager));
    const input = { branchId: s.branch.id, itemId: item.id, quantity: 1 };
    expect(s.engine.execute('snapshotItem', input).ok).toBe(false);
    for (const modifiers of [
      [{ groupId: 'milk', optionId: 'unknown' }],
      [
        { groupId: 'milk', optionId: 'oat' },
        { groupId: 'milk', optionId: 'oat' },
      ],
    ]) {
      expect(
        s.engine.execute('snapshotItem', { ...input, sizeId: 'l', modifiers })
          .ok,
      ).toBe(false);
    }
    expect(
      s.engine.execute(
        'saveItem',
        { ...s.item, categoryId: s.world.db.categories[1]!.id },
        manager,
      ),
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
  it('rejects duplicate size IDs and invalid money without creating records', () => {
    const s = setup();
    const manager = s.auth('manager');
    const before = s.engine.snapshot().db.items;
    for (const item of [
      { ...s.item, price: -1 },
      { ...s.item, sizes: [...s.item.sizes, s.item.sizes[0]!] },
    ])
      expect(s.engine.execute('saveItem', item, manager).ok).toBe(false);
    expect(s.engine.snapshot().db.items).toEqual(before);
  });
  it('unknown slug is missing and menus expose no credentials', () => {
    const s = setup();
    expect(s.engine.execute('publicVenue', { slug: 'missing' })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    const menu = data(s.engine.execute('publicVenue', { slug: s.branch.slug }));
    expect(menu.branch.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(JSON.stringify(menu)).not.toMatch(
      /passwordHash|accessToken|webhook/,
    );
  });
});

describe('layout and transaction boundaries', () => {
  it('F050 saving a stale draft conflicts; publishing creates history and QR locators', () => {
    const s = setup();
    const manager = s.auth('manager');
    const before = data(
      s.engine.execute('getLayout', { branchId: s.branch.id }, manager),
    );
    const save = {
      branchId: s.branch.id,
      baseVersion: before.draft.version,
      doc: before.draft,
    };
    expect(
      data(s.engine.execute('saveLayoutDraft', save, manager)).version,
    ).toBe(2);
    expect(s.engine.execute('saveLayoutDraft', save, manager)).toMatchObject({
      ok: false,
      error: { code: 'VERSION_CONFLICT' },
    });
    data(
      s.engine.execute(
        'publishLayout',
        { branchId: s.branch.id, baseVersion: 2 },
        manager,
      ),
    );
    expect(
      data(s.engine.execute('publicLayout', { branchId: s.branch.id })).version,
    ).toBe(2);
    const qr = data(
      s.engine.execute('qrSheet', { branchId: s.branch.id }, manager),
    )[0]!;
    expect(data(s.engine.execute('resolveQr', { code: qr.code })).seatId).toBe(
      qr.seatId,
    );
    data(
      s.engine.execute(
        'rotateQr',
        { branchId: s.branch.id, seatId: qr.seatId },
        manager,
      ),
    );
    expect(s.engine.execute('resolveQr', { code: qr.code })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });
  it('invalid publish leaves published floor/history/backups unchanged', () => {
    const s = setup();
    const manager = s.auth('manager');
    const layout = data(
      s.engine.execute('getLayout', { branchId: s.branch.id }, manager),
    );
    layout.draft.placements[0]!.x = -5;
    data(
      s.engine.execute(
        'saveLayoutDraft',
        { branchId: s.branch.id, baseVersion: 1, doc: layout.draft },
        manager,
      ),
    );
    const before = s.engine.snapshot();
    expect(
      s.engine.execute(
        'publishLayout',
        { branchId: s.branch.id, baseVersion: 2 },
        manager,
      ),
    ).toMatchObject({ ok: false, error: { code: 'LAYOUT_INVALID' } });
    expect(s.engine.snapshot()).toEqual(before);
  });
  it('caller mutation cannot modify live records through inputs, snapshots or responses', () => {
    const s = setup();
    const manager = s.auth('manager');
    const result = data(s.engine.execute('saveItem', s.item, manager));
    s.item.sizes[0]!.price = 1;
    result.sizes[0]!.price = 2;
    const snapshot = s.engine.snapshot();
    snapshot.db.items.length = 0;
    const saved = data(
      s.engine.execute('getCatalogue', undefined, manager),
    ).items.find((i) => i.id === result.id)!;
    expect(saved.sizes[0]!.price).toBe(30000);
    s.world.db.tenants.length = 0;
    expect(s.engine.snapshot().db.tenants.length).toBeGreaterThan(0);
  });
});

describe('integer catalogue billing', () => {
  it('calculates additions before quantity and refuses integer overflow', () => {
    expect(calculateLineTotal(30000, [5000, 2000], 3)).toBe(111000);
    expect(() => calculateLineTotal(Number.MAX_SAFE_INTEGER, [1], 1)).toThrow();
    expect(() => calculateLineTotal(1, [], 0)).toThrow();
  });
});

describe('AI fallback contract', () => {
  it('disabled, unavailable and malformed AI keep the rules fallback and redact input', () => {
    const s = setup();
    const tenant = s.world.db.tenants[0]!;
    const tx: Tx = {
      ...s.world,
      now: 0,
      auth: {},
      deps: {},
      keep: (effect) => effect(s.world.db),
    };
    expect(
      callAi(tx, tenant, 'classify', 'Contact user@example.com', () => true).run
        .validation,
    ).toBe('skipped_off');
    tenant.settings.aiEnabled = true;
    tx.deps.ai = () => ({ error: 'unavailable' });
    expect(
      callAi(tx, tenant, 'classify', 'Contact user@example.com', () => true)
        .value,
    ).toBeNull();
    tx.deps.ai = () => ({ output: { anything: true } });
    const result = callAi(
      tx,
      tenant,
      'classify',
      'Contact user@example.com',
      () => null,
    );
    expect(result.run.validation).toBe('malformed');
    expect(result.run.input).not.toContain('user@example.com');
  });
});

describe('AI malformed-adapter boundaries', () => {
  it('parser exceptions, circular outputs and echoed PII do not escape the fallback', () => {
    const world = createPilotWorld();
    const tenant = world.db.tenants[0]!;
    tenant.settings.aiEnabled = true;
    const tx: Tx = {
      ...world,
      now: 0,
      auth: {},
      deps: { ai: () => ({ output: 'user@example.com' }) },
      keep: (effect) => effect(world.db),
    };
    const result = callAi(tx, tenant, 'classify', 'hello', () => {
      throw new Error('bad parser');
    });
    expect(result.value).toBeNull();
    expect(result.run.validation).toBe('malformed');
    expect(result.run.output).not.toContain('user@example.com');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    tx.deps.ai = () => ({ output: circular });
    expect(
      callAi(tx, tenant, 'classify', 'hello', () => true).run.validation,
    ).toBe('malformed');
  });
});

it('F112 supports optional audit filters through the typed command runner', () => {
  const s = setup();
  const owner = s.auth('owner');
  const row = data(s.engine.execute('saveItem', s.item, owner));
  data(s.engine.execute('archiveItem', { itemId: row.id }, owner));
  const audit = data(
    s.engine.execute(
      'listAudit',
      { action: 'item.archive', actorId: `${s.tenant.id}-owner` },
      owner,
    ),
  );
  expect(audit).toHaveLength(1);
  expect(audit[0]!.target).toBe(row.id);
});
