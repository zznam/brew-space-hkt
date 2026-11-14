import { expect, test } from '@playwright/test';
test('customer tab is shared with merchant, persists, and stays in its venue', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'The Grind Co-Work' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.getByRole('button', { name: /^Seat 8, booth, Available/ }).click();
  await page
    .getByRole('button', { name: 'Start metered', exact: true })
    .click();
  await page.getByRole('button', { name: /^Add Cold brew/ }).click();
  await page
    .getByRole('button', { name: '+30m · all venues', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /65.000/ })).toBeVisible();
  await page.getByRole('button', { name: 'Merchant', exact: true }).click();
  await expect(page.getByText(/Seat 8 · 30 min · 65.000/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Seat 8 · 30 min · 65.000/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Matcha & Muse Studio', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /^Seat 8, booth, Available/ }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'The Grind Co-Work', exact: true })
    .click();
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.getByRole('button', { name: 'My session', exact: true }).click();
  await page
    .getByRole('button', { name: 'End demo session', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /^Seat 8, booth, Available/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
