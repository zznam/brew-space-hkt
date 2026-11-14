const { test } = require('node:test');
const assert = require('node:assert/strict');
const S = require('./services.js');

function fixture() {
  return {
    seats: [{ id: 'W03' }, { id: 'F02' }],
    serviceInventory: { 'book-deepwork': 1, 'power-strip': 2, pen: 5 },
    loans: [],
    serviceSales: [],
  };
}

test('a loan request reserves a book without changing the original inventory state', () => {
  const before = fixture();
  const after = S.requestLoan(before, {
    serviceId: 'book-deepwork',
    seatId: 'W03',
    quantity: 1,
    key: 'L1',
  });
  assert.equal(after.loans.length, 1);
  assert.equal(after.loans[0].status, 'requested');
  assert.equal(S.available(after, 'book-deepwork'), 0);
  assert.equal(before.loans.length, 0);
});

test('handoff keeps stock reserved and a confirmed return releases it once', () => {
  const requested = S.requestLoan(fixture(), {
    serviceId: 'book-deepwork',
    seatId: 'W03',
    key: 'L1',
  });
  const borrowed = S.advanceLoan(requested, 'L1', 'borrowed');
  assert.equal(borrowed.loans[0].status, 'borrowed');
  assert.equal(S.available(borrowed, 'book-deepwork'), 0);
  const returned = S.advanceLoan(borrowed, 'L1', 'returned');
  assert.equal(S.available(returned, 'book-deepwork'), 1);
  assert.equal(
    S.available(S.advanceLoan(returned, 'L1', 'returned'), 'book-deepwork'),
    1,
  );
  assert.equal(requested.loans[0].status, 'requested');
});

test('staff cancellation releases requested inventory', () => {
  const requested = S.requestLoan(fixture(), {
    serviceId: 'power-strip',
    seatId: 'W03',
    quantity: 2,
    key: 'L1',
  });
  const cancelled = S.advanceLoan(requested, 'L1', 'cancelled');
  assert.equal(cancelled.loans[0].status, 'cancelled');
  assert.equal(S.available(cancelled, 'power-strip'), 2);
});

test('an item cannot be returned before staff has handed it over', () => {
  const state = S.requestLoan(fixture(), {
    serviceId: 'book-deepwork',
    seatId: 'W03',
    key: 'L1',
  });
  assert.throws(() => S.advanceLoan(state, 'L1', 'returned'), {
    code: 'INVALID_TRANSITION',
  });
});

test('a second borrower cannot reserve the last copy already requested', () => {
  const state = S.requestLoan(fixture(), {
    serviceId: 'book-deepwork',
    seatId: 'W03',
    key: 'L1',
  });
  assert.throws(
    () =>
      S.requestLoan(state, {
        serviceId: 'book-deepwork',
        seatId: 'F02',
        key: 'L2',
      }),
    { code: 'OUT_OF_STOCK' },
  );
});

test('retrying the same loan request does not reserve twice', () => {
  const request = { serviceId: 'power-strip', seatId: 'W03', key: 'L1' };
  const state = S.requestLoan(S.requestLoan(fixture(), request), request);
  assert.equal(state.loans.length, 1);
  assert.equal(S.available(state, 'power-strip'), 1);
});

test('loan requests reject fractional, zero and negative quantities', () => {
  for (const quantity of [0, -1, 1.5, NaN]) {
    assert.throws(
      () =>
        S.requestLoan(fixture(), {
          serviceId: 'power-strip',
          seatId: 'W03',
          quantity,
          key: 'L1',
        }),
      { code: 'INVALID_QUANTITY' },
    );
  }
});

test('loan requests require a real seat and a borrowable item', () => {
  assert.throws(
    () =>
      S.requestLoan(fixture(), {
        serviceId: 'power-strip',
        seatId: 'INVALID',
        key: 'L1',
      }),
    { code: 'UNKNOWN_SEAT' },
  );
  assert.throws(
    () =>
      S.requestLoan(fixture(), { serviceId: 'pen', seatId: 'W03', key: 'L1' }),
    { code: 'NOT_BORROWABLE' },
  );
});

test('a completed retail purchase decrements stock without mutating its input', () => {
  const before = fixture();
  const after = S.sell(before, {
    key: 'P1',
    lines: [{ serviceId: 'pen', quantity: 2 }],
  });
  assert.equal(after.serviceInventory.pen, 3);
  assert.equal(after.serviceSales.length, 1);
  assert.equal(before.serviceInventory.pen, 5);
});

test('duplicate purchase callbacks consume inventory only once', () => {
  const purchase = { key: 'P1', lines: [{ serviceId: 'pen', quantity: 2 }] };
  const after = S.sell(S.sell(fixture(), purchase), purchase);
  assert.equal(after.serviceInventory.pen, 3);
  assert.equal(after.serviceSales.length, 1);
});

test('retail validation aggregates duplicate lines before checking stock', () => {
  const before = fixture();
  assert.throws(
    () =>
      S.sell(before, {
        key: 'P1',
        lines: [
          { serviceId: 'pen', quantity: 3 },
          { serviceId: 'pen', quantity: 3 },
        ],
      }),
    { code: 'OUT_OF_STOCK' },
  );
  assert.equal(before.serviceInventory.pen, 5);
});

test('invalid retail lines never partially consume inventory', () => {
  const before = fixture();
  assert.throws(
    () =>
      S.sell(before, {
        key: 'P1',
        lines: [
          { serviceId: 'pen', quantity: 1 },
          { serviceId: 'book-deepwork', quantity: 1 },
        ],
      }),
    { code: 'NOT_FOR_SALE' },
  );
  assert.equal(before.serviceInventory.pen, 5);
  assert.throws(
    () =>
      S.sell(before, {
        key: 'P2',
        lines: [{ serviceId: 'pen', quantity: -1 }],
      }),
    { code: 'INVALID_QUANTITY' },
  );
});

test('old browser state gains service inventory while preserving orders and zero stock', () => {
  const before = {
    seats: [{ id: 'W03' }],
    orders: [{ id: 'existing-order' }],
    serviceInventory: { pen: 0 },
  };
  const after = S.ensureState(before);
  assert.equal(after.orders[0].id, 'existing-order');
  assert.equal(after.serviceInventory.pen, 0);
  assert.ok(after.serviceInventory.basket > 0);
  assert.deepEqual(after.loans, []);
  assert.equal(before.loans, undefined);
});
