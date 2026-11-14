import { expect, test } from '@playwright/test';

test('web renders the 3D canvas and keeps the phone layout within the viewport', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const canvas = page.locator(
    'canvas[aria-label="The Grind Co-Work 3D floor canvas"]',
  );
  await expect(canvas).toBeVisible();
  expect(
    await canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      return Boolean(
        canvas.width && canvas.height && canvas.getContext('webgl2'),
      );
    }),
  ).toBe(true);
  await page.getByRole('button', { name: 'Top-Down', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom +', exact: true }).click();
  await expect(canvas).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await canvas.evaluate(
      (element) => (element as HTMLCanvasElement).style.touchAction,
    ),
  ).toBe('pan-y');
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(
    page.locator('canvas[aria-label="Mặt bằng 3D của The Grind Co-Work"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Từ trên xuống', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('a failed WebGL context shows a selectable 2D fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  await expect(
    page.getByText('3D is unavailable. Use the 2D seat map below.'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Seat 8, Available, 2D map', exact: true })
    .click();
  await expect(page.getByText(/Selected: Seat 8/)).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /^Seat 8, booth, Available,/,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(
    page.getByText(
      'Không thể hiển thị 3D. Hãy dùng sơ đồ chỗ ngồi 2D bên dưới.',
    ),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Chỗ 8, Đang trống, sơ đồ 2D', exact: true })
    .click();
  await expect(page.getByText(/Đang chọn: Chỗ 8/)).toBeVisible();
});
