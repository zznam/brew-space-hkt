const { test } = require('node:test');
const assert = require('node:assert/strict');
const J = require('./journey.js');
const S = require('./services.js');
const NOW = Date.UTC(2026, 10, 14, 7);
const HOUR = 3600000;
const model = J.createModel({
  kinds: {
    window: { label: 'Cửa sổ', rate: 40000 },
    focus: { label: 'Tập trung', rate: 30000 },
    meeting: { label: 'Bàn nhóm', rate: 90000 },
  },
  menu: [
    { id: 'latte', name: 'Cà phê sữa', price: 45000 },
    { id: 'tea', name: 'Trà đào', price: 45000 },
  ],
});
function fixture() {
  return J.ensureState(
    S.ensureState({
      version: 1,
      seats: [
        { id: 'W03', number: 3, kind: 'window', status: 'free' },
        { id: 'F01', number: 5, kind: 'focus', status: 'free' },
        { id: 'W01', number: 1, kind: 'window', status: 'occupied' },
        { id: 'M02', number: 12, kind: 'meeting', status: 'free' },
      ],
      orders: [],
      bookings: [],
      support: [],
    }),
  );
}

test('a fresh visit starts at table identification without a preselected table', () => {
  const state = fixture();
  assert.equal(state.journey.phase, 'arrival');
  assert.equal(state.journey.draft.seatId, null);
  assert.equal(state.customerSessions.length, 0);
});

function pass(result) {
  assert.equal(result.ok, true, result.error);
  return result.state;
}
function prepared({
  member = false,
  items = { latte: 1 },
  code = '',
  seat = 'W03',
} = {}) {
  let state = fixture();
  if (member) state = pass(model.useDemoMember(state));
  state = pass(model.selectSeat(state, seat, 'number'));
  state = pass(model.updateDraft(state, { items, minutes: 120 }));
  state = pass(model.reviewDraft(state));
  return pass(
    model.checkPackage(
      state,
      member ? { packageId: 'pack-2h' } : { code },
      NOW,
    ),
  );
}
function started(options = {}) {
  return pass(model.start(prepared(options), { key: 'first', now: NOW }));
}

test('occupied and unknown seats cannot be selected by any entry method', () => {
  for (const method of ['qr', 'number', 'map']) {
    assert.equal(model.selectSeat(fixture(), 'W01', method).ok, false);
    assert.equal(model.selectSeat(fixture(), 'XXX', method).ok, false);
  }
});
test('start requires explicit package review; editing services invalidates it', () => {
  let state = pass(model.selectSeat(fixture(), 'W03', 'qr'));
  assert.equal(
    model.start(state, { key: 'x', now: NOW }).code,
    'REVIEW_REQUIRED',
  );
  state = prepared();
  state = pass(model.updateDraft(state, { items: { tea: 1 } }));
  assert.equal(
    model.start(state, { key: 'x', now: NOW }).code,
    'REVIEW_REQUIRED',
  );
});
test('guest cannot choose member package by id but can validate the demo code', () => {
  let state = pass(model.selectSeat(fixture(), 'W03', 'map'));
  state = pass(model.reviewDraft(state));
  assert.equal(
    model.checkPackage(state, { packageId: 'pack-2h' }, NOW).ok,
    false,
  );
  assert.equal(model.checkPackage(state, { code: 'BAD' }, NOW).ok, false);
  state = pass(model.checkPackage(state, { code: ' nep2h ' }, NOW));
  assert.equal(model.quoteDraft(state, NOW).covered, 80000);
});
test('package type, venue, expiry and previous use are enforced', () => {
  for (const patch of [
    { expiresAt: NOW - 1 },
    { venueId: 'elsewhere' },
    { status: 'used' },
    { status: 'in_use', claimedBy: 'another' },
  ]) {
    let state = pass(model.useDemoMember(fixture()));
    state = {
      ...state,
      prepaidPackages: state.prepaidPackages.map((p) => ({ ...p, ...patch })),
    };
    state = pass(model.selectSeat(state, 'W03', 'qr'));
    state = pass(model.reviewDraft(state));
    assert.equal(
      model.checkPackage(state, { packageId: 'pack-2h' }, NOW).ok,
      false,
    );
  }
  let state = pass(model.useDemoMember(fixture()));
  state = pass(model.selectSeat(state, 'M02', 'map'));
  state = pass(model.reviewDraft(state));
  assert.equal(
    model.checkPackage(state, { packageId: 'pack-2h' }, NOW).ok,
    false,
  );
});
test('review separates prepaid hours and one included drink from extras', () => {
  const state = prepared({ member: true, items: { latte: 2, pen: 1 } }),
    quote = model.quoteDraft(state, NOW);
  assert.equal(quote.gross, 182000);
  assert.equal(quote.covered, 125000);
  assert.equal(quote.due, 57000);
  assert.equal(state.serviceInventory.pen, 20);
  assert.equal(state.customerSessions.length, 0);
});
test('starting is atomic and revalidates seat, inventory and package after review', () => {
  for (const kind of ['seat', 'stock', 'package']) {
    let state = prepared({
      member: true,
      items: { pen: 2, 'book-deepwork': 1 },
    });
    if (kind === 'seat')
      state = {
        ...state,
        seats: state.seats.map((s) =>
          s.id === 'W03' ? { ...s, status: 'occupied' } : s,
        ),
      };
    if (kind === 'stock')
      state = {
        ...state,
        serviceInventory: { ...state.serviceInventory, 'book-deepwork': 0 },
      };
    if (kind === 'package')
      state = {
        ...state,
        prepaidPackages: state.prepaidPackages.map((p) => ({
          ...p,
          status: 'used',
        })),
      };
    const before = JSON.stringify(state),
      result = model.start(state, { key: 'x', now: NOW });
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result.state), before);
    assert.equal(state.serviceInventory.pen, 20);
  }
});
test('start commits stock and requests loans without recording payment or points', () => {
  const state = started({
      member: true,
      items: { latte: 1, pen: 2, basket: 1 },
    }),
    session = model.getSession(state);
  assert.equal(state.seats.find((s) => s.id === 'W03').status, 'occupied');
  assert.equal(state.serviceInventory.pen, 18);
  assert.equal(state.loans[0].sessionId, session.id);
  assert.equal(state.orders[0].paymentStatus, 'on_tab');
  assert.equal(state.orders[0].items[0].qty, 1);
  assert.equal(state.customerReceipts.length, 0);
  assert.equal(state.loyalty.balance, 250);
  assert.equal(state.prepaidPackages[0].status, 'in_use');
  const retry = model.start(state, { key: 'first', now: NOW + 100 });
  assert.equal(retry.ok, true);
  assert.equal(retry.state.serviceInventory.pen, 18);
  assert.equal(retry.state.customerSessions.length, 1);
});
test('actual bill rounds elapsed minutes and applies the prepaid time once', () => {
  const state = started({ member: true });
  assert.equal(model.quoteSession(state, NOW).due, 0);
  assert.equal(model.quoteSession(state, NOW + 2 * HOUR).due, 0);
  const quote = model.quoteSession(state, NOW + 2.5 * HOUR);
  assert.equal(quote.minutes, 150);
  assert.equal(quote.covered, 125000);
  assert.equal(quote.due, 20000);
});
test('session prices survive later catalog changes', () => {
  const state = started();
  const changed = J.createModel({
    kinds: { window: { rate: 999999 } },
    menu: [{ id: 'latte', name: 'New', price: 999999 }],
  });
  assert.equal(changed.quoteSession(state, NOW + HOUR).due, 85000);
});
test('adding services appends to same tab and cannot reuse included drink', () => {
  let state = started({ member: true });
  const session = model.getSession(state);
  state = pass(model.beginAdd(state));
  state = pass(model.updateDraft(state, { items: { latte: 1, pen: 1 } }));
  state = pass(model.reviewDraft(state));
  state = pass(model.checkPackage(state, {}, NOW + HOUR));
  state = pass(model.start(state, { key: 'additional', now: NOW + HOUR }));
  assert.equal(state.customerSessions.length, 1);
  assert.equal(model.getSession(state).id, session.id);
  assert.equal(model.getSession(state).startedAt, NOW);
  assert.equal(model.quoteSession(state, NOW + HOUR).due, 57000);
  assert.equal(state.orders.length, 2);
});
test('borrowed items block payment until staff confirms return; request alone does not release inventory', () => {
  let state = started({ items: { basket: 1 } });
  const id = state.loans[0].id;
  state = S.advanceLoan(state, id, 'borrowed');
  state = pass(model.requestReturn(state, id));
  assert.equal(state.loans[0].status, 'borrowed');
  assert.equal(S.available(state, 'basket'), 5);
  state = pass(model.openCheckout(state, NOW + HOUR));
  assert.equal(
    model.finish(state, { key: 'pay', now: NOW + HOUR }).code,
    'LOANS_OUTSTANDING',
  );
  state = S.advanceLoan(state, id, 'returned');
  state = pass(model.finish(state, { key: 'pay', now: NOW + HOUR }));
  assert.equal(S.available(state, 'basket'), 6);
  assert.equal(state.customerReceipts.length, 1);
});
test('a customer can cancel their own pending loan but cannot self-return borrowed stock', () => {
  let state = started({ items: { basket: 1 } });
  const id = state.loans[0].id;
  assert.equal(model.requestReturn(state, id).ok, false);
  assert.equal(model.cancelLoan(state, 'other').ok, false);
  state = pass(model.cancelLoan(state, id));
  assert.equal(state.loans[0].status, 'cancelled');
  state = pass(model.openCheckout(state, NOW));
  assert.equal(model.finish(state, { key: 'pay', now: NOW }).ok, true);
});
test('checkout quote is fixed until resume, which includes all elapsed use', () => {
  let state = started({ items: {} });
  state = pass(model.openCheckout(state, NOW + HOUR));
  assert.equal(model.quoteSession(state, NOW + 2 * HOUR).due, 40000);
  state = pass(model.resume(state));
  assert.equal(model.quoteSession(state, NOW + 2 * HOUR).due, 80000);
});
test('failed payment is side effect free; valid settlement earns and redeems once', () => {
  let state = started({ member: true, items: { latte: 1, pen: 1 } });
  state = pass(model.openCheckout(state, NOW + 2.5 * HOUR));
  const before = JSON.stringify(state);
  assert.equal(
    model.finish(state, {
      key: 'pay',
      now: NOW + 2.5 * HOUR,
      points: 20,
      success: false,
    }).code,
    'PAYMENT_FAILED',
  );
  assert.equal(JSON.stringify(state), before);
  assert.equal(
    model.finish(state, { key: 'pay', points: 11 }).code,
    'INVALID_POINTS',
  );
  const result = model.finish(state, {
    key: 'pay',
    now: NOW + 2.5 * HOUR,
    points: 20,
  });
  state = pass(result);
  assert.equal(result.receipt.cashDue, 30000);
  assert.equal(result.receipt.pointsEarned, 3);
  assert.equal(state.loyalty.balance, 233);
  assert.equal(state.prepaidPackages[0].status, 'used');
  assert.equal(state.seats.find((s) => s.id === 'W03').status, 'free');
  assert.equal(state.orders[0].paymentStatus, 'paid');
  const retry = model.finish(state, { key: 'pay', points: 20 });
  assert.equal(retry.receipt.id, result.receipt.id);
  assert.equal(retry.state.loyalty.balance, 233);
  assert.equal(retry.state.customerReceipts.length, 1);
});
test('full prepaid coverage closes without charging and earns no points', () => {
  let state = started({ member: true });
  state = pass(model.openCheckout(state, NOW + HOUR));
  const result = model.finish(state, { key: 'zero', now: NOW + HOUR });
  assert.equal(result.ok, true);
  assert.equal(result.receipt.cashDue, 0);
  assert.equal(result.receipt.pointsEarned, 0);
  assert.equal(result.state.loyalty.balance, 250);
});
test('guest cannot redeem points or switch identity during an active visit', () => {
  let state = started();
  assert.equal(model.useDemoMember(state).ok, false);
  assert.equal(model.newVisit(state).ok, false);
  assert.equal(model.selectSeat(state, 'F01', 'map').ok, false);
  state = pass(model.openCheckout(state, NOW + HOUR));
  assert.equal(
    model.finish(state, { key: 'x', points: 10 }).code,
    'INVALID_POINTS',
  );
});
test('profile validation preserves identity and ignores attempts to inject points or member status', () => {
  const state = fixture();
  for (const values of [{ name: '' }, { phone: 'bad' }, { email: 'bad' }])
    assert.equal(model.updateProfile(state, values).ok, false);
  const next = pass(
    model.updateProfile(state, {
      name: ' Linh ',
      phone: '0901234567',
      email: 'linh@example.com',
      marketingConsent: true,
      id: 'member-demo',
      isMember: true,
      balance: 99999,
    }),
  );
  assert.equal(next.profile.name, 'Linh');
  assert.equal(next.profile.id, 'guest-demo');
  assert.equal(next.profile.isMember, false);
  assert.equal(next.loyalty.balance, 250);
  assert.equal(next.profile.marketingConsent, true);
});
test('demo clock advances actual billing exactly once and survives state migration', () => {
  let state = started({ items: {} });
  state = pass(model.advanceTime(state, 30));
  state = J.ensureState(JSON.parse(JSON.stringify(state)));
  assert.equal(model.quoteSession(state, NOW).minutes, 30);
  assert.equal(model.quoteSession(state, NOW).due, 20000);
});
test('a new visit preserves member ledger and cannot reuse the consumed package', () => {
  let state = started({ member: true });
  state = pass(model.openCheckout(state, NOW + HOUR));
  state = pass(model.finish(state, { key: 'done', now: NOW + HOUR }));
  state = pass(model.newVisit(state));
  assert.equal(state.journey.draft.seatId, null);
  assert.equal(state.customerReceipts.length, 1);
  state = pass(model.selectSeat(state, 'F01', 'number'));
  state = pass(model.reviewDraft(state));
  assert.equal(
    model.checkPackage(state, { packageId: 'pack-2h' }, NOW + HOUR).ok,
    false,
  );
});

test('phone validation requires digits and staff sees the shared guest field', () => {
  assert.equal(
    model.updateProfile(fixture(), { phone: '---------' }).ok,
    false,
  );
  assert.equal(
    started().seats.find((s) => s.id === 'W03').guest,
    'Khách tại quán',
  );
});
test('package allowances are snapshotted and expiry during active use does not block adding extras', () => {
  let state = prepared({ member: true });
  state = {
    ...state,
    prepaidPackages: state.prepaidPackages.map((p) => ({
      ...p,
      expiresAt: NOW + HOUR,
    })),
  };
  state = pass(model.start(state, { key: 'first', now: NOW }));
  state = {
    ...state,
    prepaidPackages: state.prepaidPackages.map((p) => ({
      ...p,
      minutes: 1,
      products: {},
    })),
  };
  assert.equal(model.quoteSession(state, NOW + 2 * HOUR).due, 0);
  state = pass(model.beginAdd(state));
  state = pass(model.updateDraft(state, { items: { pen: 1 } }));
  state = pass(model.reviewDraft(state));
  assert.equal(model.checkPackage(state, {}, NOW + 2 * HOUR).ok, true);
});
test('a package cannot be newly attached halfway through an unbundled visit', () => {
  let state = started({ code: '' });
  state = pass(model.beginAdd(state));
  state = pass(model.reviewDraft(state));
  assert.equal(
    model.checkPackage(state, { code: 'NEP2H' }, NOW + HOUR).ok,
    false,
  );
});
test('submission and receipt keys cannot be reused for a different operation', () => {
  let state = started();
  state = pass(model.beginAdd(state));
  state = pass(model.updateDraft(state, { items: { pen: 1 } }));
  state = pass(model.reviewDraft(state));
  state = pass(model.checkPackage(state, {}, NOW));
  assert.equal(
    model.start(state, { key: 'first', now: NOW }).code,
    'KEY_CONFLICT',
  );
  state = pass(model.resume(state));
  state = pass(model.openCheckout(state, NOW + HOUR));
  state = pass(model.finish(state, { key: 'pay', now: NOW + HOUR }));
  assert.equal(
    model.finish(state, { key: 'pay', points: 10 }).code,
    'KEY_CONFLICT',
  );
  state = pass(model.newVisit(state));
  state = pass(model.selectSeat(state, 'F01', 'number'));
  state = pass(model.reviewDraft(state));
  state = pass(model.checkPackage(state, {}, NOW + HOUR));
  state = pass(model.start(state, { key: 'second', now: NOW + HOUR }));
  state = pass(model.openCheckout(state, NOW + 2 * HOUR));
  assert.equal(
    model.finish(state, { key: 'pay', now: NOW + 2 * HOUR }).code,
    'KEY_CONFLICT',
  );
});
