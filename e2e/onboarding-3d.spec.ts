import { expect, test } from '@playwright/test';

test('cafe owner can upload multiple files in one selection and select them again', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'The Grind Co-Work' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Onboard Cafe / 3D Studio', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Onboard Your Cafe with OpenAI & 3D Engine',
    }),
  ).toBeVisible();

  const files = [
    {
      name: 'floorplan.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('Room: 10m x 8m\nSeats: 2 desks and 1 pod'),
    },
    {
      name: 'menu.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Espresso: 40000 VND\nTea: 35000 VND'),
    },
  ];
  const picker = page.locator('input[type="file"]');
  await picker.setInputFiles(files);
  await expect(page.getByText('Processed 2 uploaded file(s).')).toBeVisible();
  await expect(page.getByText('[DOCUMENT] floorplan.md')).toBeVisible();
  await expect(page.getByText('[DOCUMENT] menu.txt')).toBeVisible();
  await expect(picker).toHaveValue('');

  await page
    .getByRole('button', { name: 'Clear uploads', exact: true })
    .click();
  await picker.setInputFiles(files);
  await expect(
    page.getByText('Photos, videos and documents · 2 attached'),
  ).toBeVisible();
  await expect(page.getByText('[DOCUMENT] floorplan.md')).toBeVisible();
  await expect(page.getByText('[DOCUMENT] menu.txt')).toBeVisible();
});

test('cafe owner onboards with photos/videos/docs, chats through multiple 3D iterations, restores or publishes to customer view', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'The Grind Co-Work' }),
  ).toBeVisible();
  await expect(
    page.getByText(/3D Spatial Engine · The Grind Co-Work/),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Onboard Cafe / 3D Studio', exact: true })
    .click();

  await expect(
    page.getByRole('heading', {
      name: 'Onboard Your Cafe with OpenAI & 3D Engine',
    }),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: 'Sample 1: Saigon Roastery & Brick Loft',
      exact: true,
    })
    .click();

  await expect(
    page.getByText('[VIDEO] cafe-walkthrough-tour.mp4'),
  ).toBeVisible();
  await expect(
    page.getByText('[DOCUMENT] saigon-roastery-menu-and-floorplan.md'),
  ).toBeVisible();

  // Iteration #1: Initial generation
  await page
    .getByRole('button', { name: 'Generate 3D Cafe Environment', exact: true })
    .click();

  await expect(
    page.getByText(
      /3D Spatial Engine · Saigon Roastery & Loft \(14m × 10m · industrial\)/,
    ),
  ).toBeVisible();
  await expect(page.getByText('Generated Iterations (1)')).toBeVisible();

  // Iteration #2 via chat feedback loop
  await page
    .getByLabel('Refinement instruction for AI')
    .fill('Add 2 focus pods and switch lighting to neon-night');
  await page
    .getByRole('button', { name: 'Refine 3D Scene with AI', exact: true })
    .click();

  await expect(page.getByText('Generated Iterations (2)')).toBeVisible();
  await expect(page.getByText('Bookable Seats (10)')).toBeVisible();
  await expect(
    page.getByText(
      /Changes: Lighting: cozy-amber → neon-night · Seats: 8 → 10/,
    ),
  ).toBeVisible();

  // Iteration #3 via chat feedback loop
  await page
    .getByLabel('Refinement instruction for AI')
    .fill('Expand room to 16m x 12m and add 1 booth');
  await page
    .getByRole('button', { name: 'Refine 3D Scene with AI', exact: true })
    .click();

  await expect(page.getByText('Generated Iterations (3)')).toBeVisible();
  await expect(page.getByText('Bookable Seats (11)')).toBeVisible();
  await expect(
    page.getByText(
      /3D Spatial Engine · Saigon Roastery & Loft \(16m × 12m · industrial\)/,
    ),
  ).toBeVisible();

  // Test restoring Iteration #2 from the Iteration timeline bar
  await page.getByRole('button', { name: 'Iteration #2', exact: true }).click();
  await expect(page.getByText('Bookable Seats (10)')).toBeVisible();

  // Publish Iteration #2 to the live app
  await page
    .getByRole('button', { name: 'Publish 3D Cafe to Live App', exact: true })
    .click();

  await expect(
    page.getByText(
      /Published! Saigon Roastery & Loft \(Iteration #2\) is now active/,
    ),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Preview as Customer', exact: true })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Saigon Roastery & Loft' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: /^Focus Pod 9, pod, Available/ })
    .click();
  await page
    .getByRole('button', { name: 'Start metered', exact: true })
    .click();
  await page
    .getByRole('button', { name: /^Add Saigon Phin Cold Brew/ })
    .click();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await page
    .getByRole('button', { name: '+30m · all venues', exact: true })
    .click();

  // Focus Pod 9 (45,000/h -> 22,500 for 30m) + Saigon Phin Cold Brew (45,000) = 67,500 VND
  await expect(page.getByRole('heading', { name: /67.500/ })).toBeVisible();
  expect(errors).toEqual([]);
});
