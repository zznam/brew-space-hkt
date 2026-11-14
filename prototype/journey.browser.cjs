/* Run with the root HTTP server on port 4173; uses an isolated browser profile. */
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const base = process.env.NEP_BASE_URL || 'http://127.0.0.1:4173/prototype';
const fixedTime = Date.UTC(2026, 10, 14, 7);
let checks = 0;
const errors = [];
function check(condition, label) {
  assert.ok(condition, label);
  checks++;
}
async function state(page) {
  return page.evaluate(() => globalThis.Nep.getState());
}
async function phase(page, value) {
  await expect.poll(async () => (await state(page)).journey.phase).toBe(value);
  checks++;
}
async function choose(page, value = '3') {
  await page.locator('#table-number').fill(value);
  await page.locator('#table-form button').click();
  await page.locator('#confirm-table').click();
  await phase(page, 'services');
}
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript((time) => {
      Date.now = () => time;
    }, fixedTime);
    context.on('page', (page) =>
      page.on('pageerror', (error) => errors.push(error.message)),
    );
    const customer = await context.newPage();
    await customer.goto(`${base}/customer.html`);
    await phase(customer, 'arrival');
    const arrivalState = await state(customer);
    check(arrivalState.journey.draft.seatId === null, 'No table preselected');
    await customer.locator('#table-number').fill('W01');
    await customer.locator('#table-form button').click();
    await expect(customer.locator('#journey-error')).toContainText(
      /đang dùng/i,
    );
    await phase(customer, 'arrival');
    await customer.locator('#table-number').fill('999');
    await customer.locator('#table-form button').click();
    await expect(customer.locator('#journey-error')).toContainText(
      'Không tìm thấy',
    );
    await choose(customer);
    await customer.locator('[data-add="latte"]').click();
    check(
      (await state(customer)).journey.draft.items.latte === 1,
      'Drink click adds actual drink',
    );
    await customer.locator('[data-quantity="latte"][data-delta="-1"]').click();
    check(
      !('latte' in (await state(customer)).journey.draft.items),
      'Last unit can be removed',
    );
    await customer.locator('[data-add="latte"]').click();
    await customer.locator('[data-add="tea"]').click();
    for (const [category, item] of [
      ['books', 'book-deepwork'],
      ['shared', 'power-strip'],
      ['stationery', 'pen'],
    ]) {
      await customer.locator(`[data-category="${category}"]`).click();
      await customer.locator(`[data-service-action="${item}"]`).click();
    }
    check(
      (await state(customer)).loans.length === 0,
      'Selecting a loan does not send it before review',
    );
    check(
      (await state(customer)).serviceInventory.pen === 20,
      'Selecting retail does not decrement inventory',
    );
    const servicesState = await state(customer);
    await customer.locator('#review-services').click();
    await phase(customer, 'package');
    await expect(customer.locator('#start-visit')).toBeDisabled();
    await customer.locator('#demo-member').click();
    await customer.locator('[data-use-package="pack-2h"]').click();
    const packageState = await state(customer);
    const review = await customer.evaluate(() =>
      globalThis.Nep.journey.quoteDraft(globalThis.Nep.getState(), Date.now()),
    );
    check(
      review.covered === 125000 && review.due === 57000,
      'Package separates 120min + latte from tea and stationery',
    );
    await customer.locator('#start-visit').click();
    await phase(customer, 'active');
    const initial = await state(customer);
    const visitId = initial.journey.activeSessionId;
    check(
      initial.customerReceipts.length === 0 && initial.loyalty.balance === 250,
      'Starting does not charge or earn points',
    );
    check(
      initial.serviceInventory.pen === 19 && initial.loans.length === 2,
      'Starting commits retail and loan requests',
    );
    check(
      initial.orders[0].paymentStatus === 'on_tab',
      'Order is unpaid until checkout',
    );
    const staff = await context.newPage();
    await staff.goto(`${base}/operations.html`);
    await staff.locator('[data-seat="W03"]').click();
    await expect(staff.locator('#seat-detail')).toContainText(
      'Tạm tính sau gói',
    );
    await staff.locator('#check-out').click();
    check(
      (await state(staff)).seats.find((seat) => seat.id === 'W03').status ===
        'occupied',
      'Staff cannot bypass unpaid checkout',
    );
    await staff.locator('#close-seat-sheet').click();
    await staff.locator('details summary').click();
    await staff.locator('#operation-date').fill('2026-11-15');
    await staff.locator('#operation-date').dispatchEvent('change');
    await staff.locator('[data-seat="W03"]').click();
    check(
      errors.length === 0,
      'An active visit does not break future-date seat details',
    );
    await staff.locator('#close-seat-sheet').click();
    await staff.locator('#operation-date').fill('2026-11-14');
    await staff.locator('#operation-date').dispatchEvent('change');
    await staff.locator('[data-view="services"]').click();
    while (await staff.locator('[data-loan-next="borrowed"]').count()) {
      await staff.locator('[data-loan-next="borrowed"]').first().click();
    }
    await expect
      .poll(async () =>
        (await state(customer)).loans.every(
          (loan) => loan.status === 'borrowed',
        ),
      )
      .toBe(true);
    checks++;
    await staff.locator('[data-view="pos"]').click();
    await expect(staff.locator('#operation-screen-content')).toContainText(
      'Ghi vào phiên · Chưa checkout',
    );
    await staff.locator('[data-order]').first().click();
    check(
      (await state(staff)).orders[0].paymentStatus === 'on_tab',
      'Serving does not mark order paid',
    );
    for (let i = 0; i < 5; i++) await customer.locator('#advance-time').click();
    check(
      (
        await customer.evaluate(() =>
          globalThis.Nep.journey.quoteSession(
            globalThis.Nep.getState(),
            Date.now(),
          ),
        )
      ).minutes === 150,
      'Demo time advances once',
    );
    await customer.locator('#add-services').click();
    await customer.locator('[data-add="latte"]').click();
    await customer.locator('#review-services').click();
    await customer.locator('#check-current-package').click();
    const addition = await customer.evaluate(() =>
      globalThis.Nep.journey.quoteDraft(globalThis.Nep.getState(), Date.now()),
    );
    check(
      addition.covered === 125000 && addition.due === 122000,
      'Additional latte does not reuse included drink',
    );
    await customer.locator('#start-visit').click();
    await phase(customer, 'active');
    check(
      (await state(customer)).journey.activeSessionId === visitId &&
        (await state(customer)).customerSessions.length === 1,
      'Addition retains the same visit',
    );
    await expect(customer.locator('#customer-content')).toContainText(
      'Đã phục vụ',
    );
    await expect(customer.locator('#customer-content')).toContainText(
      'Đã gửi quán',
    );
    await customer.locator('#open-checkout').click();
    await phase(customer, 'checkout');
    await expect(customer.locator('#pay-checkout')).toBeDisabled();
    while (await customer.locator('[data-return-loan]').count())
      await customer.locator('[data-return-loan]').first().click();
    await staff.locator('[data-view="services"]').click();
    await staff.locator('[data-loan-pane="borrowed"]').click();
    await expect(staff.locator('#operations-services')).toContainText(
      'Khách yêu cầu trả',
    );
    check(
      (await state(customer)).loans.every((loan) => loan.status === 'borrowed'),
      'Return request does not self-return inventory',
    );
    while (await staff.locator('[data-loan-next="returned"]').count())
      await staff.locator('[data-loan-next="returned"]').first().click();
    await expect(customer.locator('#pay-checkout')).toBeEnabled();
    await customer.locator('#checkout-points').fill('10');
    await customer.locator('#checkout-points').press('Tab');
    await expect(customer.locator('#checkout-total')).toContainText('121.000');
    await customer.locator('#simulate-failure').click();
    await expect(customer.locator('#journey-error')).toContainText(
      'chưa thành công',
    );
    const failed = await state(customer);
    check(
      failed.customerReceipts.length === 0 &&
        failed.loyalty.balance === 250 &&
        failed.seats.find((seat) => seat.id === 'W03').status === 'occupied',
      'Payment failure preserves visit, points and table',
    );
    await customer.locator('#pay-checkout').click();
    await phase(customer, 'receipt');
    const settled = await state(customer),
      receipt = settled.customerReceipts[0];
    check(
      receipt.cashDue === 121000 &&
        receipt.pointsUsed === 10 &&
        receipt.pointsEarned === 12,
      'Receipt charges extras after package and points',
    );
    check(
      settled.loyalty.balance === 252 &&
        settled.orders.every((order) => order.paymentStatus === 'paid'),
      'Settlement updates loyalty and all order payment statuses',
    );
    check(
      settled.seats.find((seat) => seat.id === 'W03').status === 'free',
      'Successful checkout releases table',
    );
    check(
      settled.serviceInventory.pen === 19,
      'Checkout does not consume retail twice',
    );
    for (const width of [320, 375, 414, 768]) {
      await customer.setViewportSize({ width, height: 844 });
      for (const [label, sample] of [
        ['arrival', arrivalState],
        ['services', servicesState],
        ['package', packageState],
        ['active', initial],
        ['checkout', failed],
        ['receipt', settled],
      ]) {
        await customer.evaluate(
          (sample) => globalThis.Nep.replaceState(sample),
          sample,
        );
        const layout = await customer.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          viewport: innerWidth,
          clipped: [
            ...document.querySelectorAll(
              '#customer-content .button, #customer-content input:not([type=checkbox])',
            ),
          ]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width &&
                (r.left < 0 ||
                  r.right > innerWidth + 1 ||
                  el.scrollWidth > el.clientWidth + 2)
              );
            })
            .map((el) => el.id || el.textContent.trim()),
        }));
        check(
          layout.width <= layout.viewport && !layout.clipped.length,
          `${label} fits ${width}px: ${JSON.stringify(layout)}`,
        );
      }
      await staff.setViewportSize({ width, height: 844 });
      await staff.locator('[data-view=space]').click();
      check(
        await staff.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Operations fits ${width}px`,
      );
    }
    await customer.setViewportSize({ width: 390, height: 844 });
    await customer.evaluate(
      (sample) => globalThis.Nep.replaceState(sample),
      settled,
    );
    await customer.reload();
    await phase(customer, 'receipt');
    check(
      (await state(customer)).customerReceipts.length === 1,
      'Receipt persists without duplicate settlement',
    );
    await customer.locator('[data-customer-tab="profile"]').click();
    await customer.locator('#profile-name').fill('Lan Nguyễn');
    await customer.locator('#profile-phone').fill('0901234567');
    await customer.locator('#profile-email').fill('lan@example.test');
    await customer.locator('#save-profile').click();
    await customer.reload();
    await customer.locator('[data-customer-tab="profile"]').click();
    await expect(customer.locator('#profile-name')).toHaveValue('Lan Nguyễn');
    await expect(customer.locator('#profile-phone')).toHaveValue('0901234567');
    checks += 2;
    await customer.locator('[data-customer-tab="loyalty"]').click();
    await expect(customer.locator('.loyalty-balance')).toContainText('252');
    await expect(customer.locator('.loyalty-ledger')).toContainText('-10 điểm');
    checks += 2;
    await context.close();

    const guestContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await guestContext.addInitScript((time) => {
      Date.now = () => time;
    }, fixedTime);
    const guest = await guestContext.newPage();
    guest.on('pageerror', (error) => errors.push(error.message));
    await guest.goto(`${base}/customer.html?venue=wrong&table=W03`);
    await expect(guest.locator('#journey-error')).toContainText('không thuộc');
    await phase(guest, 'arrival');
    await guest.goto(`${base}/customer.html?venue=nep-q3&table=W01`);
    await expect(guest.locator('#journey-error')).toContainText(/đang dùng/i);
    await guest.goto(`${base}/customer.html?venue=nep-q3&table=W03`);
    await expect(guest.locator('#customer-dialog')).toBeVisible();
    check(
      (await state(guest)).journey.draft.seatId === null,
      'QR opens confirmation without claiming a seat',
    );
    await guest.locator('#confirm-table').click();
    await guest.locator('[data-add="latte"]').click();
    await guest.locator('#review-services').click();
    await guest.locator('#package-code').fill('NEP2H');
    await guest.locator('#package-form button').click();
    await guest.locator('#start-visit').click();
    await guest.locator('#advance-time').click();
    await guest.locator('#open-checkout').click();
    await expect(guest.locator('#pay-checkout')).toContainText(
      'Kết thúc phiên',
    );
    await guest.locator('#pay-checkout').click();
    await phase(guest, 'receipt');
    const freeReceipt = (await state(guest)).customerReceipts[0];
    check(
      freeReceipt.cashDue === 0 && freeReceipt.pointsEarned === 0,
      'Fully covered guest visit closes without charging or points',
    );
    await guest.locator('#new-visit').click();
    await guest.locator('[data-seat="F01"]').focus();
    await guest.locator('[data-seat="F01"]').press('Enter');
    await guest.locator('#confirm-table').click();
    check(
      (await state(guest)).journey.draft.method === 'map',
      'Map supports keyboard table confirmation',
    );
    await guest.locator('#review-services').click();
    await guest.locator('#package-code').fill('NEP2H');
    await guest.locator('#package-form button').click();
    await expect(guest.locator('#journey-error')).toContainText(
      'Gói không hợp lệ',
    );
    await guest.locator('#no-package').click();
    await guest.locator('#start-visit').click();
    await guest.locator('#advance-time').click();
    await guest.locator('#open-checkout').click();
    await guest.locator('#pay-checkout').click();
    await phase(guest, 'receipt');
    check(
      (await state(guest)).customerReceipts[1].cashDue === 15000,
      'Explicit no-package visit bills actual minutes',
    );
    await guestContext.close();
    check(errors.length === 0, `No browser errors: ${errors.join('; ')}`);
    console.log(`PASS: ${checks} journey and cross-screen assertions`);
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
