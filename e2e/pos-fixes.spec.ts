import { expect, test } from '@playwright/test';

test('New order stays a walk-in order even when a seat is selected', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Seat 3, desk, Available/ }).click();
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Walk-in order' }),
  ).toBeVisible();
});

test('Sell to a seat opens a seat-scoped order', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Seat 3, desk, Available/ }).click();
  await page
    .getByRole('button', { name: 'Sell to Seat 3', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Sell to Seat 3' }),
  ).toBeVisible();
});

test('Cancelling an order leaves a usable fresh draft, not a dead end', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  await page.getByRole('button', { name: /^Cold brew/ }).click();
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  // The cart must accept a new item right away, not silently ignore it.
  await page.getByRole('button', { name: /^Cold brew/ }).click();
  await expect(page.getByRole('heading', { name: '45.000 ₫' })).toBeVisible();
});

test('Marking an in-cart item sold out disables further increments instead of silently doing nothing', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New order', exact: true }).click();
  await page.getByRole('button', { name: /^Cold brew/ }).click();
  await page
    .getByRole('button', { name: 'Mark sold out', exact: true })
    .first()
    .click();
  const increment = page.getByRole('button', { name: '+', exact: true });
  await expect(increment).toBeDisabled();
});
