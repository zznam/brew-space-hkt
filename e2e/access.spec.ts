import { test as base, expect, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { openDatabase } from '../server/database';
import { createApiServer } from '../server/http';
import type { Reply } from '../src/core/pilot/engine';
import { createVnpayGateway } from '../server/vnpay';
import { createHmac } from 'node:crypto';

const password = 'browser-test-password';
const testGatewaySecret = 'browser-test-gateway-key-not-production';
function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(reply.error.code);
  return reply.data;
}
const test = base.extend<{ api: string }>({
  api: async ({ page }, runWithApi) => {
    const dir = mkdtempSync(join(tmpdir(), 'brewspace-access-e2e-'));
    const db = openDatabase(join(dir, 'app.sqlite'));
    db.bootstrap('admin@test.example', password);
    const admin = data(
      db.execute('platformSignIn', { email: 'admin@test.example', password }),
    ).token;
    const venue = data(
      db.execute(
        'createTenant',
        {
          name: 'Test Cafe',
          currency: 'VND',
          branch: {
            name: 'Test Cafe',
            slug: 'test-cafe',
            address: '123 Test Street',
            timezone: 'Asia/Ho_Chi_Minh',
            hours: Array.from({ length: 7 }, () => ({
              open: '07:00',
              close: '22:00',
            })),
          },
          owner: { name: 'Test Owner', email: 'owner@test.example', password },
        },
        { platformToken: admin },
      ),
    );
    const owner = data(
      db.execute('staffSignIn', { email: 'owner@test.example', password }),
    ).token;
    const category = data(
      db.execute(
        'saveCategory',
        { name: 'Coffee', sort: 0 },
        { staffToken: owner },
      ),
    );
    data(
      db.execute(
        'saveItem',
        {
          name: 'House latte',
          categoryId: category.id,
          kind: 'food_drink',
          price: 30000,
          sizes: [{ id: 'large', name: 'Large', price: 45000 }],
          modifierGroups: [],
          limited: false,
        },
        { staffToken: owner },
      ),
    );
    data(
      db.execute(
        'inviteStaff',
        {
          name: 'Cashier',
          email: 'cashier@test.example',
          password,
          role: 'cashier',
          branchIds: [venue.branch.id],
        },
        { staffToken: owner },
      ),
    );
    const server = createApiServer(db, {
      allowedOrigins: ['http://127.0.0.1:8081'],
      gateway: createVnpayGateway(
        {
          tenantId: venue.tenant.id,
          tmnCode: 'BROWSERTEST',
          hashSecret: testGatewaySecret,
          publicOrigin: 'http://127.0.0.1:8081',
          serverIp: '127.0.0.1',
          mode: 'sandbox',
        },
        async () => new Response(null, { status: 503 }),
      ),
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    // Proxy to a real isolated HTTP service/SQLite database, never mock its replies.
    await page.context().route('http://127.0.0.1:3001/**', async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace('http://127.0.0.1:3001', url),
      });
      await route.fulfill({ response });
    });
    const worker = setInterval(
      () => db.execute('processFulfilment', undefined),
      100,
    );
    try {
      await runWithApi(url);
    } finally {
      clearInterval(worker);
      await page.unrouteAll({ behavior: 'wait' });
      await page.context().unrouteAll({ behavior: 'wait' });
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  },
});
async function login(
  page: Page,
  email = 'owner@test.example',
  path = '/staff',
) {
  await page.goto(path);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test('owner signs in, invites and revokes staff with no demo controls or stored credentials', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page);
  await expect(
    page.getByRole('heading', { name: 'Test Cafe', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Reset all demo data', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Team', exact: true }).click();
  await page.getByRole('button', { name: 'Add staff', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('New Server');
  await page.getByLabel('Email', { exact: true }).fill('new@test.example');
  await page
    .getByLabel('Initial password (12+ characters)', { exact: true })
    .fill(password);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Add staff', exact: true }).click();
  await expect(
    page.getByText('Staff account created.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Revoke access New Server', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Confirm revocation', exact: true })
    .click();
  await expect(
    page.getByText('Server · Revoked', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    password,
  );
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Staff sign in', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Staff sign in', exact: true }),
  ).toBeVisible();
});

test('owner brand edits reach the public venue and unknown slugs show not found', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page);
  await page.getByRole('button', { name: /^Brand/ }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Evening Cafe');
  await page.getByLabel('Background colour', { exact: true }).fill('#172b24');
  // F265: an unreadable text colour is previewed, explained and cannot be saved.
  await page.getByLabel('Text colour', { exact: true }).fill('#2a3d36');
  await expect(
    page.getByText(/is too low\. Use at least 4\.5:1/),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Save changes', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Text colour', { exact: true }).fill('#ffffff');
  await expect(page.getByText(/easy to read\.$/)).toBeVisible();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Open customer menu · Test Cafe',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Evening Cafe', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('House latte', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Large · 45.000 ₫', { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `/tmp/brewspace-access-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto('/v/unknown-venue');
  await expect(
    page.getByText('Venue not found', { exact: true }),
  ).toBeVisible();
});

test('platform creates a venue and owner can sign in with the issued account', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page, 'admin@test.example', '/platform');
  await page.getByRole('button', { name: 'Create venue', exact: true }).click();
  await page.getByLabel('Venue name', { exact: true }).fill('Second Cafe');
  await page.getByLabel('Venue address', { exact: true }).fill('second-cafe');
  await page
    .getByLabel('Street address', { exact: true })
    .fill('456 Test Street');
  await page.getByLabel('Owner name', { exact: true }).fill('Second Owner');
  await page
    .getByLabel('Owner email', { exact: true })
    .fill('second@test.example');
  await page
    .getByLabel('Owner password (12+ characters)', { exact: true })
    .fill(password);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Create venue', exact: true }).click();
  await expect(
    page.getByText('Venue and owner account created.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await login(page, 'second@test.example');
  await expect(
    page.getByRole('heading', { name: 'Second Cafe', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Open customer menu · Second Cafe',
      exact: true,
    })
    .click();
  await expect(
    page.getByText('The menu is being prepared', { exact: true }),
  ).toBeVisible();
});

test('cashier cannot manage staff and sign-in copy works in Vietnamese', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page, 'cashier@test.example');
  await page.getByRole('button', { name: 'Team', exact: true }).click();
  await expect(
    page.getByText('You do not have access to this page.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add staff', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Đăng nhập nhân viên', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('bad@test.example');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(
    page.getByText('Vui lòng đăng nhập lại để tiếp tục.', { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test('public venue survives an offline failure with an explicit retry', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await page.route('**/api/venues/test-cafe', (route) => route.abort());
  await page.goto('/v/test-cafe');
  await expect(
    page.getByText(
      'Could not reach the service. Check your connection and try again.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.unroute('**/api/venues/test-cafe');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('House latte', { exact: true })).toBeVisible();
});

test('live catalogue edits reach a separate customer and staff availability respects roles', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page
    .getByRole('button', { name: 'Manage categories', exact: true })
    .click();
  await page.getByLabel('Category name', { exact: true }).fill('Tea');
  await page
    .getByRole('button', { name: 'Save category', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Edit category Tea', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Back to catalogue', exact: true })
    .click();
  await page.getByRole('button', { name: 'New item', exact: true }).click();
  await page.getByLabel('Item name', { exact: true }).fill('Jasmine tea');
  await page.getByRole('button', { name: 'Tea', exact: true }).click();
  await page.getByLabel('Price (VND)', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Add size', exact: true }).click();
  await page.getByLabel('Size 1 name', { exact: true }).fill('Large');
  await page.getByLabel('Size 1 price (VND)', { exact: true }).fill('35000');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Jasmine tea', exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  // Reload destroys the in-memory identity, but server catalogue data survives.
  await login(page, 'cashier@test.example');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Jasmine tea', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit Jasmine tea', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'New item', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Mark Jasmine tea sold out', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Make Jasmine tea available',
      exact: true,
    }),
  ).toBeVisible();
  const menu = await fetch(`${api}/api/venues/test-cafe`).then((r) => r.json());
  expect(
    menu.data.items.map((item: { name: string }) => item.name),
  ).not.toContain('Jasmine tea');
  await page
    .getByRole('button', { name: 'Make Jasmine tea available', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Mark Jasmine tea sold out',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/v/test-cafe');
  await page.getByRole('button', { name: 'Tea', exact: true }).click();
  await expect(page.getByText('Jasmine tea', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Large · 35.000 ₫', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('House latte', { exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('customer quote becomes one paid order, staff serve it and close a balanced shift', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await page.goto('/v/test-cafe');
  await page
    .getByRole('button', { name: 'Add House latte', exact: true })
    .click();
  await page
    .getByLabel('Note for House latte · Large', { exact: true })
    .fill('No ice');
  await page.getByRole('button', { name: 'Review price', exact: true }).click();
  await expect(
    page.getByText('Total · 45.000 ₫', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Place order · pay at counter', exact: true })
    .click();
  await expect(
    page.getByText('Awaiting payment', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Awaiting payment', { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  const staff = await page.context().newPage();
  await login(staff, 'cashier@test.example', '/staff/orders');
  await staff.getByLabel('Opening cash (VND)', { exact: true }).fill('100000');
  await staff.getByRole('button', { name: 'Open shift', exact: true }).click();
  await staff.getByRole('button', { name: /^Open order / }).click();
  await staff.getByLabel('Cash received (VND)', { exact: true }).fill('50000');
  await staff
    .getByRole('button', { name: 'Confirm cash received', exact: true })
    .click();
  await expect(
    staff.getByText('Cash recorded. Change · 5.000 ₫', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Check status', exact: true }).click();
  await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Tickets', exact: true }).click();
  await expect(staff.getByText('No ice', { exact: true })).toBeVisible();
  await staff
    .getByRole('button', { name: 'Start preparing', exact: true })
    .click();
  await staff.getByRole('button', { name: 'Mark ready', exact: true }).click();
  // F226: the customer's open order screen announces the ready ticket.
  await page.getByRole('button', { name: 'Check status', exact: true }).click();
  await expect(page.getByText(/^Your order is ready/)).toBeVisible();
  await staff.getByRole('button', { name: 'Mark served', exact: true }).click();
  await expect(
    staff.getByText('No open tickets', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Check status', exact: true }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Orders', exact: true }).click();
  await staff.getByRole('button', { name: /^Cash shift/ }).click();
  await staff.getByLabel('Counted cash (VND)', { exact: true }).fill('145000');
  await staff.getByRole('button', { name: 'Close shift', exact: true }).click();
  await expect(
    staff.getByText('Difference · 0 ₫', { exact: true }),
  ).toBeVisible();
  await noOverflow(staff);
  await staff.close();
});

test('cashier creates a quoted walk-in order and customer can cancel an unpaid order', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page, 'cashier@test.example', '/staff/orders');
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  await page
    .getByRole('button', { name: 'Add House latte', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review price', exact: true }).click();
  await page.getByRole('button', { name: 'Create order', exact: true }).click();
  await expect(
    page.getByText('Open your own shift before confirming cash.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/v/test-cafe');
  await page
    .getByRole('button', { name: 'Add House latte', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review price', exact: true }).click();
  await page
    .getByRole('button', { name: 'Place order · pay at counter', exact: true })
    .click();
  await page
    .getByLabel('Cancellation reason', { exact: true })
    .fill('Changed plans');
  await page
    .getByRole('button', { name: 'Cancel unpaid order', exact: true })
    .click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
  await expect(page.getByText('Paid', { exact: true })).toHaveCount(0);
});

test('gateway return restores the guest order and only a verified callback marks it paid', async ({
  page,
  api,
}) => {
  await page.route('https://sandbox.vnpayment.vn/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>Gateway test fixture</h1>',
    }),
  );
  await page.goto('/v/test-cafe');
  await page
    .getByRole('button', { name: 'Add House latte', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review price', exact: true }).click();
  await page
    .getByRole('button', { name: 'Place order · pay at counter', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pay online', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Gateway test fixture' }),
  ).toBeVisible();
  const checkout = new URL(page.url());
  const returnUrl = checkout.searchParams.get('vnp_ReturnUrl')!;
  await page.goto(`${returnUrl}?vnp_ResponseCode=00&vnp_TransactionStatus=00`);
  await expect(
    page.getByText('Verifying payment. Check status before paying again.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('Paid', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Cancel unpaid order', exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
  const callback = new URLSearchParams({
    vnp_TmnCode: 'BROWSERTEST',
    vnp_TxnRef: checkout.searchParams.get('vnp_TxnRef')!,
    vnp_Amount: checkout.searchParams.get('vnp_Amount')!,
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TransactionNo: '987654321',
  });
  callback.sort();
  callback.set(
    'vnp_SecureHash',
    createHmac('sha512', testGatewaySecret)
      .update(callback.toString())
      .digest('hex'),
  );
  expect(
    await (await fetch(`${api}/api/payments/vnpay/ipn?${callback}`)).json(),
  ).toMatchObject({ RspCode: '00' });
  await page.getByRole('button', { name: 'Check status', exact: true }).click();
  await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Pay online', exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'guest-order',
  );
});

test('owner voucher appears in the quote, reserves one use and returns it on cancellation', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page, 'owner@test.example', '/staff/offers');
  await page.getByRole('button', { name: 'New offer', exact: true }).click();
  await page.getByLabel('Voucher code', { exact: true }).fill('OPENING');
  await page.getByLabel('Maximum discount (VND)', { exact: true }).fill('2000');
  await page.getByLabel('Usage limit', { exact: true }).fill('1');
  await noOverflow(page);
  await page
    .getByRole('button', { name: 'Create voucher', exact: true })
    .click();
  await expect(page.getByText('Offer saved.', { exact: true })).toBeVisible();
  const customer = await page.context().newPage();
  await customer.goto('/v/test-cafe');
  await customer
    .getByRole('button', { name: 'Add House latte', exact: true })
    .click();
  await customer.getByRole('button', { name: /^Offer Choose one/ }).click();
  await customer.getByLabel('Voucher code', { exact: true }).fill('OPENING');
  await customer
    .getByRole('button', { name: 'Review price', exact: true })
    .click();
  await expect(
    customer.getByText('OPENING · −2.000 ₫', { exact: true }),
  ).toBeVisible();
  await expect(
    customer.getByText('Total · 43.000 ₫', { exact: true }),
  ).toBeVisible();
  await customer
    .getByRole('button', { name: 'Place order · pay at counter', exact: true })
    .click();
  await expect(
    customer.getByText('Awaiting payment', { exact: true }),
  ).toBeVisible();
  // Reload the owner screen's data without trusting customer-reported quota counts.
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await page.getByRole('button', { name: 'Offers', exact: true }).click();
  await expect(
    page.getByText('0 used · 1 reserved · 1 total', { exact: true }),
  ).toBeVisible();
  await customer
    .getByLabel('Cancellation reason', { exact: true })
    .fill('Changed plans');
  await customer
    .getByRole('button', { name: 'Cancel unpaid order', exact: true })
    .click();
  await expect(customer.getByText('Cancelled', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await page.getByRole('button', { name: 'Offers', exact: true }).click();
  await expect(
    page.getByText('0 used · 0 reserved · 1 total', { exact: true }),
  ).toBeVisible();
  await noOverflow(customer);
  await customer.close();
});

test('cashier proposal needs owner approval before a flash sale reaches the menu', async ({
  page,
  api,
}) => {
  expect(api).toBeTruthy();
  await login(page, 'cashier@test.example', '/staff/offers');
  await page.getByRole('button', { name: 'New offer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Voucher', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Offer name', { exact: true }).fill('Afternoon coffee');
  await page
    .getByRole('button', { name: 'Submit for approval', exact: true })
    .click();
  await expect(page.getByText(/Awaiting approval ·/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Approve offer/ }),
  ).toHaveCount(0);
  expect(
    (await (await fetch(`${api}/api/venues/test-cafe`)).json()).data.sales,
  ).toHaveLength(0);
  const owner = await page.context().newPage();
  await login(owner, 'owner@test.example', '/staff/offers');
  await owner
    .getByRole('button', { name: /^Approve offer Afternoon coffee/ })
    .click();
  await owner
    .getByLabel('Decision reason', { exact: true })
    .fill('Approved for quiet hours');
  await owner
    .getByRole('button', { name: 'Approve offer', exact: true })
    .click();
  await expect(owner.getByText(/Approved ·/)).toBeVisible();
  await page.goto('/v/test-cafe');
  await page
    .getByRole('button', { name: 'Add House latte', exact: true })
    .click();
  await page.getByRole('button', { name: /^Offer Choose one/ }).click();
  await page
    .getByRole('button', { name: 'Afternoon coffee · 10%', exact: true })
    .click();
  await page.getByRole('button', { name: 'Review price', exact: true }).click();
  await expect(
    page.getByText('Afternoon coffee · −4.500 ₫', { exact: true }),
  ).toBeVisible();
  await noOverflow(owner);
  await owner.close();
});
