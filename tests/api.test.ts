import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase, type AppDatabase } from '../server/database';
import { createApiServer } from '../server/http';
import type { Input, Output, Reply } from '../src/core/pilot/engine';
import { credentials } from '../server/security';

const password = 'test-password-12345';
const tenantInput = (slug: string): Input<'createTenant'> => ({
  name: slug,
  currency: 'VND',
  branch: {
    name: slug,
    slug,
    address: 'Test address',
    timezone: 'Asia/Ho_Chi_Minh',
    hours: Array.from({ length: 7 }, () => ({ open: '07:00', close: '22:00' })),
  },
  owner: { name: 'Owner', email: `${slug}@test.example`, password },
});
function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(JSON.stringify(reply.error));
  return reply.data;
}

describe('durable API access foundation', () => {
  let dir: string;
  let path: string;
  let db: AppDatabase;
  let server: ReturnType<typeof createApiServer>;
  let url: string;
  let platform: string;
  let owner: string;
  let tenant: Output<'createTenant'>;
  async function request(route: string, input?: unknown, token?: string) {
    const response = await fetch(`${url}${route}`, {
      method: input === undefined ? 'GET' : 'POST',
      headers: {
        ...(input === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: input === undefined ? undefined : JSON.stringify(input),
    });
    return { status: response.status, body: await response.json() };
  }
  const command = (name: string, input: unknown = {}, token = owner) =>
    request(`/api/commands/${name}`, input, token);

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'brewspace-api-'));
    path = join(dir, 'app.sqlite');
    db = openDatabase(path);
    db.bootstrap('admin@test.example', password);
    server = createApiServer(db, { allowedOrigins: ['http://localhost:8081'] });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    platform = (
      await request('/api/platform/sign-in', {
        email: 'admin@test.example',
        password,
      })
    ).body.data.token;
    tenant = (await command('createTenant', tenantInput('cafe-one'), platform))
      .body.data;
    owner = (
      await request('/api/staff/sign-in', {
        email: 'cafe-one@test.example',
        password,
      })
    ).body.data.token;
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates independent venues and exposes only public brand/menu data', async () => {
    const category = (
      await command('saveCategory', { name: 'Coffee', sort: 0 })
    ).body.data;
    expect(
      (
        await command('saveItem', {
          categoryId: category.id,
          name: 'Latte',
          kind: 'food_drink',
          price: 45000,
          sizes: [],
          modifierGroups: [],
          limited: false,
        })
      ).status,
    ).toBe(200);
    const publicVenue = await request('/api/venues/cafe-one');
    expect(publicVenue.body.data).toMatchObject({
      currency: 'VND',
      brand: { displayName: 'cafe-one' },
      branch: { timezone: 'Asia/Ho_Chi_Minh', hours: tenant.branch.hours },
      items: [{ price: 45000 }],
    });
    expect(JSON.stringify(publicVenue.body)).not.toMatch(
      /password|token|staff|settings|session/i,
    );
    expect((await request('/api/venues/missing')).status).toBe(404);
    expect(
      (await command('createTenant', tenantInput('forbidden'))).status,
    ).toBe(401);
    expect(
      (
        await command('updateBrand', {
          brand: { ...tenant.tenant.brand, html: '<script>' },
        })
      ).status,
    ).toBe(400);
  });

  it('rejects body-supplied identity, unknown commands, malformed bodies and foreign origins', async () => {
    expect((await command('listStaff', {}, '')).status).toBe(401);
    expect(
      (await command('listStaff', { auth: { staffToken: owner } }, '')).status,
    ).toBe(401);
    expect(
      (await command('listStaff', { tenantId: tenant.tenant.id })).status,
    ).toBe(400);
    expect((await command('snapshot')).status).toBe(404);
    const bad = await fetch(`${url}/api/staff/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{broken',
    });
    expect(bad.status).toBe(400);
    const foreign = await fetch(`${url}/api/health`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    expect(foreign.status).toBe(403);
    const allowed = await fetch(`${url}/api/health`, {
      headers: { Origin: 'http://localhost:8081' },
    });
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:8081',
    );
    expect(allowed.headers.get('Cache-Control')).toBe('no-store');
  });

  it('enforces role and branch scope and immediately applies changed assignments and revocation', async () => {
    const second = (
      await command('createBranch', { ...tenantInput('other-branch').branch })
    ).body.data;
    const staff = (
      await command('inviteStaff', {
        name: 'Manager',
        email: 'manager@test.example',
        password,
        role: 'manager',
        branchIds: [tenant.branch.id],
      })
    ).body.data;
    const token = (
      await request('/api/staff/sign-in', { email: staff.email, password })
    ).body.data.token;
    expect((await command('listStaff', {}, token)).status).toBe(403);
    expect(
      (await command('getLayout', { branchId: second.id }, token)).status,
    ).toBe(403);
    expect(
      (await command('getLayout', { branchId: tenant.branch.id }, token))
        .status,
    ).toBe(200);
    await command('updateStaff', {
      staffId: staff.id,
      role: 'cashier',
      branchIds: [second.id],
    });
    expect(
      (await command('saveCategory', { name: 'No', sort: 0 }, token)).status,
    ).toBe(403);
    expect((await command('me', {}, token)).body.data.staff.branchIds).toEqual([
      second.id,
    ]);
    await command('revokeStaff', { staffId: staff.id });
    expect((await command('me', {}, token)).status).toBe(401);
    expect(
      (
        await command('updateStaff', {
          staffId: tenant.owner.id,
          role: 'cashier',
          branchIds: [second.id],
        })
      ).status,
    ).toBe(400);
  });

  it('hides other tenant resources and keeps platform sessions out of staff APIs', async () => {
    const other = (
      await command('createTenant', tenantInput('cafe-two'), platform)
    ).body.data;
    expect(
      (await command('getLayout', { branchId: other.branch.id })).body.error
        .code,
    ).toBe('NOT_FOUND');
    expect(
      (
        await command('updateStaff', {
          staffId: other.owner.id,
          role: 'manager',
          branchIds: [tenant.branch.id],
        })
      ).status,
    ).toBe(404);
    expect((await command('listStaff', {}, platform)).status).toBe(401);
    expect((await command('me')).body.data.branches).toHaveLength(1);
    expect(
      (
        await command(
          'setTenantStatus',
          { tenantId: tenant.tenant.id, status: 'suspended', reason: 'Test' },
          platform,
        )
      ).status,
    ).toBe(200);
    expect((await command('me')).body.error.code).toBe('TENANT_SUSPENDED');
    expect((await request('/api/venues/cafe-one')).status).toBe(403);
    await command(
      'setTenantStatus',
      { tenantId: tenant.tenant.id, status: 'active', reason: 'Test' },
      platform,
    );
    expect((await command('me')).status).toBe(200);
  });

  it('persists state and sessions across connections without lost writes', async () => {
    const other = openDatabase(path);
    try {
      data(
        other.execute(
          'saveCategory',
          { name: 'First connection', sort: 0 },
          { staffToken: owner },
        ),
      );
      await command('saveCategory', { name: 'Second connection', sort: 1 });
      const catalogue = data(
        other.execute('getCatalogue', undefined, { staffToken: owner }),
      );
      expect(catalogue.categories.map((c) => c.name)).toEqual([
        'First connection',
        'Second connection',
      ]);
    } finally {
      other.close();
    }
    const reopened = openDatabase(path);
    try {
      expect(
        data(reopened.execute('me', undefined, { staffToken: owner })).staff.id,
      ).toBe(tenant.owner.id);
    } finally {
      reopened.close();
    }
    const sqlite = new DatabaseSync(path);
    const stored = String(
      sqlite.prepare('SELECT world FROM state').get()!.world,
    );
    sqlite.close();
    expect(stored).not.toContain(password);
    expect(stored).not.toContain(owner);
    expect(stored).not.toContain(platform);
    expect(stored).toContain('scrypt-v1:');
    expect(() => db.bootstrap('admin2@test.example', password)).toThrow(
      'already initialized',
    );
  });

  it('expires and signs out sessions and preserves throttles after failures and restart', async () => {
    const future = openDatabase(path, () => Date.now() + 13 * 60 * 60 * 1000);
    try {
      expect(
        future.execute('me', undefined, { staffToken: owner }),
      ).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    } finally {
      future.close();
    }
    expect((await command('staffSignOut')).status).toBe(200);
    expect((await command('me')).status).toBe(401);
    for (let i = 0; i < 5; i++)
      await request('/api/staff/sign-in', {
        email: 'unknown@test.example',
        password,
      });
    expect(
      (
        await request('/api/staff/sign-in', {
          email: 'unknown@test.example',
          password,
        })
      ).status,
    ).toBe(429);
    const reopened = openDatabase(path);
    try {
      expect(
        reopened.execute('staffSignIn', {
          email: 'unknown@test.example',
          password,
        }),
      ).toMatchObject({ ok: false, error: { code: 'THROTTLED' } });
    } finally {
      reopened.close();
    }
    expect((await command('platformSignOut', {}, platform)).status).toBe(200);
    expect((await command('listTenants', {}, platform)).status).toBe(401);
  });

  it('clones template menus and layouts without copying people or changing the source', async () => {
    const template = data(
      db.execute(
        'createTenant',
        { ...tenantInput('template'), isTemplate: true },
        { platformToken: platform },
      ),
    );
    const token = data(
      db.execute('staffSignIn', { email: 'template@test.example', password }),
    ).token;
    const asset = data(
      db.execute(
        'approveAsset',
        {
          tenantId: template.tenant.id,
          name: 'Private desk',
          kind: 'desk',
          width: 1,
          depth: 1,
          seatSlots: 1,
          sizeBytes: 1000,
          triangles: 100,
        },
        { platformToken: platform },
      ),
    );
    const tierId = template.branch.tiers[0]!.id;
    const doc = {
      placements: [
        {
          id: 'original-placement',
          assetId: asset.id,
          x: 2,
          z: 2,
          rotation: 0,
        },
      ],
      seats: [
        {
          id: 'original-seat',
          label: 'Window',
          zoneId: 'original-zone',
          tierId,
          amenities: [],
          placementId: 'original-placement',
        },
      ],
      zones: [{ id: 'original-zone', name: 'Window', tierId }],
    };
    const draft = data(
      db.execute(
        'saveLayoutDraft',
        { branchId: template.branch.id, baseVersion: 1, doc },
        { staffToken: token },
      ),
    );
    data(
      db.execute(
        'publishLayout',
        { branchId: template.branch.id, baseVersion: draft.version },
        { staffToken: token },
      ),
    );
    const category = data(
      db.execute(
        'saveCategory',
        { name: 'Coffee', sort: 0 },
        { staffToken: token },
      ),
    );
    const item = data(
      db.execute(
        'saveItem',
        {
          categoryId: category.id,
          name: 'Original',
          kind: 'food_drink',
          price: 30000,
          sizes: [{ id: 'large', name: 'Large', price: 40000 }],
          modifierGroups: [],
          limited: false,
        },
        { staffToken: token },
      ),
    );
    const clone = data(
      db.execute(
        'createTenant',
        { ...tenantInput('cloned'), templateBranchId: template.branch.id },
        { platformToken: platform },
      ),
    );
    data(
      db.execute(
        'saveItem',
        { ...item, name: 'Changed', sizes: [] },
        { staffToken: token },
      ),
    );
    const menu = data(db.execute('publicVenue', { slug: 'cloned' }));
    expect(menu.items).toMatchObject([
      { name: 'Original', sizes: [{ price: 40000 }] },
    ]);
    expect(menu.items[0]!.id).not.toBe(item.id);
    expect(clone.branch.tiers[0]!.id).not.toBe(template.branch.tiers[0]!.id);
    const cloneToken = data(
      db.execute('staffSignIn', { email: 'cloned@test.example', password }),
    ).token;
    const copied = data(
      db.execute(
        'getLayout',
        { branchId: clone.branch.id },
        { staffToken: cloneToken },
      ),
    );
    expect(copied.draft.seats[0]).toMatchObject({
      label: 'Window',
      tierId: clone.branch.tiers[0]!.id,
    });
    expect(copied.draft.seats[0]!.id).not.toBe('original-seat');
    expect(copied.draft.placements[0]!.assetId).not.toBe(asset.id);
    expect(copied.assets[0]!.tenantId).toBe(clone.tenant.id);
    data(
      db.execute(
        'saveLayoutDraft',
        {
          branchId: template.branch.id,
          baseVersion: draft.version,
          doc: { ...doc, placements: [{ ...doc.placements[0]!, x: 5 }] },
        },
        { staffToken: token },
      ),
    );
    expect(
      data(
        db.execute(
          'getLayout',
          { branchId: clone.branch.id },
          { staffToken: cloneToken },
        ),
      ).draft.placements[0]!.x,
    ).toBe(2);
    expect(
      (
        await command(
          'createTenant',
          { ...tenantInput('bad-copy'), templateBranchId: tenant.branch.id },
          platform,
        )
      ).status,
    ).toBe(404);
  });

  it('serializes competing branch creation and invalidates sessions on password reset', async () => {
    const results = await Promise.all([
      command('createBranch', tenantInput('same-slug').branch),
      command('createBranch', tenantInput('same-slug').branch),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect((await command('me')).body.data.branches).toHaveLength(2);
    const staff = (
      await command('inviteStaff', {
        name: 'Cashier',
        email: 'reset@test.example',
        password,
        role: 'cashier',
        branchIds: [tenant.branch.id],
      })
    ).body.data;
    const token = (
      await request('/api/staff/sign-in', { email: staff.email, password })
    ).body.data.token;
    expect((await command('getCatalogue', {}, token)).status).toBe(200);
    expect(
      (await command('saveCategory', { name: 'Forbidden', sort: 0 }, token))
        .status,
    ).toBe(403);
    await command('resetStaffPassword', {
      staffId: staff.id,
      password: 'replacement-password-123',
    });
    expect((await command('me', {}, token)).status).toBe(401);
    expect(
      (await request('/api/staff/sign-in', { email: staff.email, password }))
        .status,
    ).toBe(401);
    expect(
      (
        await request('/api/staff/sign-in', {
          email: staff.email,
          password: 'replacement-password-123',
        })
      ).status,
    ).toBe(200);
  });

  it('rejects unsupported currency/timezones and invalid hours without partial creation', async () => {
    for (const patch of [
      { currency: 'USD' },
      {
        branch: { ...tenantInput('invalid').branch, timezone: 'Europe/London' },
      },
      {
        branch: {
          ...tenantInput('invalid').branch,
          hours: [{ open: '22:00', close: '07:00' }],
        },
      },
    ])
      expect(
        (
          await command(
            'createTenant',
            { ...tenantInput('invalid'), ...patch },
            platform,
          )
        ).status,
      ).toBe(400);
    expect((await command('listTenants', {}, platform)).body.data).toHaveLength(
      1,
    );
    expect(credentials.verifyPassword('', password, 'demo-digest')).toBe(false);
  });

  it('runs a private guest order through cash and durable fulfilment over HTTP', async () => {
    const category = (
      await command('saveCategory', { name: 'Drinks', sort: 0 })
    ).body.data;
    const item = (
      await command('saveItem', {
        categoryId: category.id,
        name: 'Tea',
        kind: 'food_drink',
        price: 30000,
        sizes: [],
        modifierGroups: [],
        limited: false,
      })
    ).body.data;
    const quote = (
      await request('/api/customer/createQuote', {
        branchId: tenant.branch.id,
        lines: [{ itemId: item.id, quantity: 2 }],
      })
    ).body.data;
    expect(quote.quote.total).toBe(60000);
    const input = {
      quoteId: quote.quote.id,
      idempotencyKey: 'customer-order-key',
    };
    const order = (
      await request('/api/customer/createOrder', input, quote.quoteToken)
    ).body.data;
    expect(
      (await request('/api/customer/createOrder', input, quote.quoteToken)).body
        .data.id,
    ).toBe(order.id);
    expect(
      (
        await request(
          '/api/customer/getOrder',
          { orderId: order.id },
          'f'.repeat(64),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          '/api/customer/confirmCash',
          { orderId: order.id },
          quote.quoteToken,
        )
      ).status,
    ).toBe(404);
    const shift = (
      await command('openShift', {
        branchId: tenant.branch.id,
        openingFloat: 100000,
        idempotencyKey: 'http-shift-key',
      })
    ).body.data;
    const cashInput = {
      orderId: order.id,
      shiftId: shift.id,
      tendered: 100000,
      idempotencyKey: 'http-cash-key',
    };
    const paid = await command('confirmCash', cashInput);
    expect(paid.body.data).toMatchObject({
      change: 40000,
      order: { status: 'paid' },
    });
    expect((await command('confirmCash', cashInput)).body.data.paymentId).toBe(
      paid.body.data.paymentId,
    );
    expect((await command('processFulfilment')).status).toBe(404);
    // A second connection can resume persisted events after the request process stops.
    const worker = openDatabase(path);
    try {
      data(worker.execute('processFulfilment', undefined));
    } finally {
      worker.close();
    }
    const tickets = (
      await command('listTickets', { branchId: tenant.branch.id })
    ).body.data;
    expect(tickets).toHaveLength(1);
    for (const status of ['preparing', 'ready', 'served'])
      expect(
        (await command('advanceTicket', { ticketId: tickets[0].id, status }))
          .status,
      ).toBe(200);
    expect(
      (
        await request(
          '/api/customer/getOrder',
          { orderId: order.id },
          quote.quoteToken,
        )
      ).body.data.order.status,
    ).toBe('completed');
    const closed = (
      await command('closeShift', {
        shiftId: shift.id,
        countedCash: 160000,
        idempotencyKey: 'http-close-key',
      })
    ).body.data;
    expect(closed).toMatchObject({ expectedCash: 160000, variance: 0 });
    const sqlite = new DatabaseSync(path);
    const stored = String(
      sqlite.prepare('SELECT world FROM state').get()!.world,
    );
    sqlite.close();
    expect(stored).not.toContain(quote.quoteToken);
  });
});
