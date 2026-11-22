import { expect, test, type Page } from '@playwright/test';

async function openCatalogue(page: Page) {
  await page.goto('/merchant/catalogue');
  await expect(
    page.getByRole('heading', { name: 'Catalogue', exact: true }),
  ).toBeVisible();
}
async function customerSession(page: Page) {
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.getByRole('button', { name: /^Seat 8, booth, Available/ }).click();
  await page
    .getByRole('button', { name: 'Start metered', exact: true })
    .click();
}
async function merchantCatalogue(page: Page) {
  await page.getByRole('button', { name: 'Merchant', exact: true }).click();
  await page
    .getByRole('button', { name: 'Manage catalogue', exact: true })
    .click();
}
async function returnToSession(page: Page) {
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.getByRole('button', { name: 'My session', exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test('merchant edits a category and sized item; customer filters, selects a size and orders at the same price', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openCatalogue(page);
  await page
    .getByRole('button', { name: 'Manage categories', exact: true })
    .click();
  await page.getByLabel('Category name', { exact: true }).fill('Tea');
  await page
    .getByRole('button', { name: 'Save category', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Edit category Tea', exact: true })
    .click();
  await page.getByLabel('Category name', { exact: true }).fill('Special tea');
  await page
    .getByRole('button', { name: 'Save category', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Back to catalogue', exact: true })
    .click();
  await page.getByRole('button', { name: 'New item', exact: true }).click();
  await page.getByLabel('Item name', { exact: true }).fill('House tea');
  await page.getByRole('button', { name: 'Special tea', exact: true }).click();
  await page.getByLabel('Price (VND)', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Add size', exact: true }).click();
  await page.getByLabel('Size 1 name', { exact: true }).fill('Small');
  await page.getByLabel('Size 1 price (VND)', { exact: true }).fill('25000');
  await page.getByRole('button', { name: 'Add size', exact: true }).click();
  await page.getByLabel('Size 2 name', { exact: true }).fill('Large');
  await page.getByLabel('Size 2 price (VND)', { exact: true }).fill('35000');
  await noOverflow(page);
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'House tea', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'House tea', exact: true }),
  ).toBeVisible();
  await customerSession(page);
  await page.getByRole('button', { name: 'Special tea', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Add Cold brew/ }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Large · 35.000 ₫', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add House tea · Large', exact: true })
    .click();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByText('Order placed.', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'Merchant', exact: true }).click();
  await expect(page.getByText(/Seat 8 · 0 min · 35.000/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Seat 8 · 0 min · 35.000/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Matcha & Muse Studio', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Manage catalogue', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'House tea', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('sold-out and archived items are blocked from stale carts and persist after reload', async ({
  page,
}) => {
  await openCatalogue(page);
  await customerSession(page);
  await page
    .getByRole('button', { name: 'Add Cold brew', exact: true })
    .click();
  await merchantCatalogue(page);
  await page
    .getByRole('button', { name: 'Mark Cold brew sold out', exact: true })
    .click();
  await returnToSession(page);
  await expect(
    page.getByRole('button', { name: 'Add Cold brew', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '+', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByText('Order placed.', { exact: true })).toHaveCount(0);
  await merchantCatalogue(page);
  await page
    .getByRole('button', { name: 'Make Cold brew available', exact: true })
    .click();
  await returnToSession(page);
  await expect(
    page.getByRole('button', { name: 'Add Cold brew', exact: true }),
  ).toBeVisible();
  await merchantCatalogue(page);
  await page
    .getByRole('button', { name: 'Archive Cold brew', exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Edit Cold brew', exact: true }),
  ).toHaveCount(0);
  await returnToSession(page);
  await expect(
    page.getByRole('button', { name: 'Add Cold brew', exact: true }),
  ).toHaveCount(0);
});

test('invalid price stays editable, changed prices require review, and catalogue copy switches to Vietnamese', async ({
  page,
}) => {
  await openCatalogue(page);
  await customerSession(page);
  await page
    .getByRole('button', { name: 'Add Cold brew', exact: true })
    .click();
  await merchantCatalogue(page);
  await page
    .getByRole('button', { name: 'Edit Cold brew', exact: true })
    .click();
  await page.getByLabel('Price (VND)', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await expect(
    page.getByText(
      'Check names, categories and whole-number prices. Prices cannot be negative.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel('Price (VND)', { exact: true }).fill('50000');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await returnToSession(page);
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(
    page.getByText(
      'Menu prices changed. Review the updated total and place your order again.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page.getByText('Order placed.', { exact: true })).toBeVisible();
  await merchantCatalogue(page);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Danh mục', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Sửa Cold brew', exact: true })
    .click();
  await expect(page.getByLabel('Tên món', { exact: true })).toBeVisible();
  await noOverflow(page);
});
