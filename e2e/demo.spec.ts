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
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
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
    page.getByRole('heading', { name: 'Your receipt' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Back to explore', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /^Seat 8, booth, Available/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('member earns points, gets support and a receipt for a visit', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.getByRole('button', { name: 'Member', exact: true }).click();
  await page.getByLabel('Mobile number').fill('0901234567');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '0 points', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Seat 6, pod, Available/ }).click();
  await page
    .getByRole('button', { name: 'Start metered', exact: true })
    .click();
  await page.getByLabel('Note for staff').fill('Severe peanut allergy');
  await page.getByRole('button', { name: 'Send note', exact: true }).click();
  await expect(
    page.getByText('A team member will come to your seat.').first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '+30m · all venues', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'End demo session', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your receipt' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Back to explore', exact: true })
    .click();
  await page.getByRole('button', { name: 'Member', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '20 points', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('shared seat link, assistant answers and refund request', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.goto('/customer/explore?venue=matcha&seat=matcha-seat-3');
  await expect(
    page.getByRole('heading', { name: 'Seat 3 details' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Assistant', exact: true }).click();
  await page
    .getByLabel('Ask the venue a question')
    .fill('Còn bao nhiêu chỗ trống?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByLabel('Conversation')).toContainText(/8/);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Seat 3, desk, Available/ }).click();
  await page
    .getByRole('button', { name: '2h bundle · 15% off', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'End demo session', exact: true })
    .click();
  await page
    .getByLabel('Reason for your refund request')
    .fill('Had to leave early');
  await page
    .getByRole('button', { name: 'Request a refund', exact: true })
    .click();
  await expect(
    page.getByText('Requested - waiting for manager review'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
