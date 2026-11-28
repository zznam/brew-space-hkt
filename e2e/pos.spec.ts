import { expect, test } from '@playwright/test';
test('cashier takes a walk-in order from menu to served ticket', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  await page.getByRole('button', { name: /^Cold brew/ }).click();
  await page.getByRole('button', { name: 'Pay cash', exact: true }).click();
  await expect(page.getByText('Order sent to the kitchen.')).toBeVisible();

  // Navigate in-app (not page.goto, which reloads and loses the
  // un-persisted pos store — see docs/superpowers/plans/2026-11-14-fe1-pos.md
  // Global Constraints: this module is intentionally not persisted).
  await page.goBack();
  await page.getByRole('button', { name: 'Tickets', exact: true }).click();
  await expect(page.getByText(/Cold brew/)).toBeVisible();
  await expect(page.getByText(/^Walk-in #pos-\d+ · Cold brew/)).toBeVisible();
  await page.getByRole('button', { name: /^Start preparing/ }).click();
  await page.getByRole('button', { name: /^Mark ready/ }).click();
  await page.getByRole('button', { name: /^Mark served/ }).click();
  expect(errors).toEqual([]);
});

test('F219: a pinned item moves to the top of the POS menu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  const pins = page.getByRole('button', { name: /^Pin to top: / });
  const name = ((await pins.last().getAttribute('aria-label')) ?? '').replace(
    'Pin to top: ',
    '',
  );
  const firstItem = page
    .getByRole('button', { name: /^[^:]+, [\d.]+ ₫$/ })
    .first();
  await expect(firstItem).not.toHaveAttribute(
    'aria-label',
    new RegExp(`^${name}, `),
  );
  await pins.last().click();
  await expect(
    page.getByRole('button', { name: `Unpin: ${name}`, exact: true }),
  ).toBeVisible();
  await expect(firstItem).toHaveAttribute(
    'aria-label',
    new RegExp(`^${name}, `),
  );
  await expect(page.getByText('★ Favourite', { exact: true })).toBeVisible();
});

test('F211: park a counter order, serve another, then resume it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  await page.getByRole('button', { name: /^Cold brew/ }).click();
  await page.getByRole('button', { name: 'Park order', exact: true }).click();
  await expect(page.getByText('Parked orders', { exact: true })).toBeVisible();
  await expect(page.getByText(/^#\d+ · 1 item\(s\) · /)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Park order', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: /^Resume #\d+$/ }).click();
  await expect(page.getByText('Parked orders', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Park order', exact: true }),
  ).toBeVisible();
});
