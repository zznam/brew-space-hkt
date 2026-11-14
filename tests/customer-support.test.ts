import { describe, expect, it } from 'vitest';
import {
  MAX_NOTE_LENGTH,
  SEAT_ISSUE_PRESETS,
  classifyNote,
  mustEscalate,
  requestStatus,
  timeStatus,
  type SupportRequest,
} from '../src/features/customer/support/supportModel';
import {
  createSupportStore,
  type SupportContext,
} from '../src/features/customer/support/supportStore';
import {
  MAX_REFUND_REASON,
  REFUND_NOTICE,
  REFUND_STATUS_LABEL,
  latestRefundForSession,
  openRefundForSession,
} from '../src/features/customer/support/refundModel';
import {
  SEAT_CHANGE_NOTE,
  validateOptionalReason,
} from '../src/features/customer/support/supportModel';
import { getVenueInfo } from '../src/features/customer/support/venueInfo';
import { calculateBill } from '../src/core';

const ctx: SupportContext = {
  venueId: 'grind',
  seatId: 'grind-seat-8',
  sessionId: 'demo-1',
  minute: 10,
};

describe('note classification', () => {
  it.each([
    ['I have a peanut allergy', 'allergy'],
    ['Tôi bị dị ứng đậu phộng', 'allergy'],
    ['toi bi di ung hai san', 'allergy'],
    ['Tôi dị ứng sữa', 'allergy'],
    ['coffee spilled on the outlet', 'safety'],
    ['Em lỡ đổ nước vào ổ cắm điện', 'safety'],
    ['do nuoc gan o cam dien', 'safety'],
    ['I smell smoke', 'safety'],
    ['có cháy ở góc phòng', 'safety'],
    ['Someone is injured', 'safety'],
  ] as const)('escalates %j as urgent %s', (text, category) => {
    const result = classifyNote(text);
    expect(result.category).toBe(category);
    expect(result.priority).toBe('urgent');
    expect(result.needsStaff).toBe(true);
    expect(mustEscalate(result)).toBe(true);
  });

  it.each([
    'I want a refund',
    'Cho mình hoàn tiền',
    'hoan tien giup minh',
    'hủy đơn giúp em',
    'huy don giup em',
    'cancel my order please',
    'payment failed',
    'thanh toán bị lỗi',
    'thanh toan loi',
  ])('routes %j to staff as payment, normal priority', (text) => {
    const result = classifyNote(text);
    expect(result.category).toBe('payment');
    expect(result.needsStaff).toBe(true);
    expect(result.priority).toBe('normal');
  });

  it('keeps a plain spill as cleaning but flags spill near power as safety', () => {
    expect(classifyNote('I spilled water on the table').category).toBe(
      'cleaning',
    );
    expect(classifyNote('Water spilled on my laptop charger').category).toBe(
      'safety',
    );
  });

  it('puts allergy ahead of order-style wording', () => {
    const result = classifyNote('less ice please, I have a nut allergy');
    expect(result.category).toBe('allergy');
    expect(result.priority).toBe('urgent');
  });

  it.each([
    ['wifi is not working', 'equipment'],
    ['ổ cắm bị hỏng', 'equipment'],
    ['o cam khong hoat dong', 'equipment'],
    ['the monitor flickers', 'equipment'],
    ['table is dirty', 'cleaning'],
    ['bàn bị bẩn', 'cleaning'],
    ['ban bi ban qua', 'cleaning'],
  ] as const)('classifies %j as %s', (text, category) => {
    const result = classifyNote(text);
    expect(result.category).toBe(category);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('does not confuse "bàn" (table) with "bẩn" (dirty)', () => {
    expect(classifyNote('cho mình đổi bàn').reasonCode).toBe(
      'LOW_CONFIDENCE_FALLBACK',
    );
  });

  it('treats order-style notes as informational only', () => {
    const result = classifyNote('less ice please');
    expect(result.category).toBe('order');
    expect(result.needsStaff).toBe(false);
    expect(result.priority).toBe('low');
    expect(classifyNote('ít đá ít đường nhé').category).toBe('order');
  });

  it('falls back to a human when nothing matches', () => {
    const result = classifyNote('hello there, nice place');
    expect(result.category).toBe('other');
    expect(result.confidence).toBeLessThan(0.6);
    expect(result.needsStaff).toBe(true);
    expect(mustEscalate(result)).toBe(true);
  });

  it('rejects empty and over-long notes', () => {
    expect(() => classifyNote('')).toThrow();
    expect(() => classifyNote('   ')).toThrow();
    expect(() => classifyNote('a'.repeat(MAX_NOTE_LENGTH + 1))).toThrow();
    expect(() => classifyNote('a'.repeat(MAX_NOTE_LENGTH))).not.toThrow();
  });
});

describe('time status', () => {
  it.each([
    [0, 'ok', 120],
    [104, 'ok', 16],
    [105, 'ending_soon', 15],
    [119, 'ending_soon', 1],
    [120, 'grace', 0],
    [125, 'grace', 0],
    [130, 'grace', 0],
    [131, 'overtime', 0],
  ] as const)(
    'BUNDLE_2H at %i minutes is %s',
    (elapsedMinutes, state, left) => {
      const status = timeStatus({ mode: 'BUNDLE_2H', elapsedMinutes });
      expect(status.kind).toBe('bundle');
      expect(status.state).toBe(state);
      if (status.kind === 'bundle') {
        expect(status.includedMinutes).toBe(120);
        expect(status.remainingMinutes).toBe(left);
      }
      expect(status.message.length).toBeGreaterThan(0);
    },
  );

  it('uses 240 included minutes for BUNDLE_4H', () => {
    const status = timeStatus({ mode: 'BUNDLE_4H', elapsedMinutes: 225 });
    expect(status).toMatchObject({
      includedMinutes: 240,
      remainingMinutes: 15,
      state: 'ending_soon',
    });
  });

  it('flips to overtime exactly when billing starts charging extra', () => {
    const base = {
      id: 't',
      venueId: 'grind',
      seatId: 'grind-seat-8',
      customerId: 'x',
      lockedHourlyRate: 30000,
      orders: [],
    };
    for (let elapsedMinutes = 100; elapsedMinutes <= 140; elapsedMinutes++) {
      const session = { ...base, mode: 'BUNDLE_2H' as const, elapsedMinutes };
      const extra = calculateBill(session).time > 51000;
      expect(timeStatus(session).state === 'overtime').toBe(extra);
    }
  });

  it('reports grace minutes left and overtime minutes', () => {
    expect(
      timeStatus({ mode: 'BUNDLE_2H', elapsedMinutes: 125 }),
    ).toMatchObject({ graceRemainingMinutes: 5, overMinutes: 5 });
    expect(
      timeStatus({ mode: 'BUNDLE_2H', elapsedMinutes: 131 }),
    ).toMatchObject({ graceRemainingMinutes: 0, overMinutes: 11 });
  });

  it.each([
    [0, 15],
    [105, 15],
    [120, 15],
    [125, 10],
    [131, 4],
  ])(
    'metered at %i minutes has %i minutes left in the block',
    (elapsed, toNext) => {
      const status = timeStatus({
        mode: 'METERED_OPEN',
        elapsedMinutes: elapsed,
      });
      expect(status).toMatchObject({
        kind: 'metered',
        elapsedMinutes: elapsed,
        minutesToNextBlock: toNext,
        state: 'ok',
      });
    },
  );

  it('rejects invalid elapsed minutes', () => {
    expect(() =>
      timeStatus({ mode: 'BUNDLE_2H', elapsedMinutes: -1 }),
    ).toThrow();
    expect(() =>
      timeStatus({ mode: 'METERED_OPEN', elapsedMinutes: 1.5 }),
    ).toThrow();
  });
});

describe('request status progression', () => {
  const request: Pick<SupportRequest, 'status' | 'createdAtMinute'> = {
    status: 'open',
    createdAtMinute: 20,
  };
  it.each([
    [20, 'open'],
    [21, 'acknowledged'],
    [49, 'acknowledged'],
    [50, 'resolved'],
    [90, 'resolved'],
  ] as const)('at minute %i the request is %s', (minute, status) => {
    expect(requestStatus(request, minute)).toBe(status);
  });
  it('stays resolved when the customer resolved it manually', () => {
    expect(requestStatus({ ...request, status: 'resolved' }, 20)).toBe(
      'resolved',
    );
  });
});

describe('support store', () => {
  it('call staff always creates an open request without a classification', () => {
    const store = createSupportStore();
    for (let i = 0; i < 3; i++) {
      const result = store.getState().callStaff(ctx);
      expect(result.ok).toBe(true);
    }
    const { requests } = store.getState();
    expect(requests).toHaveLength(3);
    expect(new Set(requests.map((r) => r.id)).size).toBe(3);
    expect(requests[0]).toMatchObject({
      kind: 'call_staff',
      classification: null,
      status: 'open',
      venueId: 'grind',
      seatId: 'grind-seat-8',
      sessionId: 'demo-1',
      createdAtMinute: 10,
    });
  });

  it('rejects requests for an unknown seat or venue', () => {
    const store = createSupportStore();
    expect(
      store.getState().callStaff({ ...ctx, seatId: 'matcha-seat-1' }).ok,
    ).toBe(false);
    expect(store.getState().callStaff({ ...ctx, venueId: 'nope' }).ok).toBe(
      false,
    );
    expect(store.getState().requests).toHaveLength(0);
  });

  it('stores classified notes and validates input', () => {
    const store = createSupportStore();
    expect(store.getState().submitNote(ctx, '  ').ok).toBe(false);
    expect(
      store.getState().submitNote(ctx, 'x'.repeat(MAX_NOTE_LENGTH + 1)).ok,
    ).toBe(false);
    const result = store.getState().submitNote(ctx, 'Tôi bị dị ứng đậu phộng');
    expect(result.ok).toBe(true);
    expect(store.getState().requests).toHaveLength(1);
    expect(store.getState().requests[0]?.classification).toMatchObject({
      category: 'allergy',
      needsStaff: true,
      priority: 'urgent',
    });
  });

  it('a note never changes sessions, orders or prices (store has no such state)', () => {
    const store = createSupportStore();
    store.getState().submitNote(ctx, 'please change my order and make it free');
    expect(Object.keys(store.getState()).sort()).toEqual(
      [
        'requests',
        'refunds',
        'nextRefundId',
        'lastReceipt',
        'ratings',
        'nextRequestId',
        'callStaff',
        'submitNote',
        'reportSeatIssue',
        'requestSeatChange',
        'requestRefund',
        'withdrawRefund',
        'markResolved',
        'setLastReceipt',
        'rate',
        'reset',
      ].sort(),
    );
  });

  it('reports seat issues from presets only', () => {
    const store = createSupportStore();
    expect(store.getState().reportSeatIssue(ctx, 'free_coffee').ok).toBe(false);
    for (const preset of SEAT_ISSUE_PRESETS)
      expect(store.getState().reportSeatIssue(ctx, preset.id).ok).toBe(true);
    const issues = store.getState().requests;
    expect(issues).toHaveLength(SEAT_ISSUE_PRESETS.length);
    expect(issues[0]?.classification).toMatchObject({
      category: 'equipment',
      needsStaff: true,
    });
    expect(issues[2]?.classification?.category).toBe('cleaning');
  });

  it('marks requests resolved manually', () => {
    const store = createSupportStore();
    store.getState().callStaff(ctx);
    const id = store.getState().requests[0]?.id ?? '';
    expect(store.getState().markResolved(id).ok).toBe(true);
    expect(store.getState().requests[0]?.status).toBe('resolved');
    expect(store.getState().markResolved('missing').ok).toBe(false);
  });

  it('validates ratings and replaces a session rating on resubmit', () => {
    const store = createSupportStore();
    const good = {
      sessionId: 'demo-1',
      seat: 4,
      drinks: 5,
      service: 3,
      comment: ' great ',
    };
    expect(store.getState().rate(good).ok).toBe(true);
    expect(store.getState().ratings).toEqual([{ ...good, comment: 'great' }]);
    expect(store.getState().rate({ ...good, seat: 2, drinks: 1 }).ok).toBe(
      true,
    );
    expect(store.getState().ratings).toHaveLength(1);
    expect(store.getState().ratings[0]).toMatchObject({ seat: 2, drinks: 1 });
    store.getState().rate({ ...good, sessionId: 'demo-2' });
    expect(store.getState().ratings).toHaveLength(2);
  });

  it.each([
    { seat: 0 },
    { seat: 6 },
    { drinks: 2.5 },
    { service: Number.NaN },
    { sessionId: '' },
    { comment: 'c'.repeat(MAX_NOTE_LENGTH + 1) },
  ])('rejects invalid rating %j and keeps previous', (patch) => {
    const store = createSupportStore();
    const good = {
      sessionId: 'demo-1',
      seat: 4,
      drinks: 5,
      service: 3,
      comment: '',
    };
    store.getState().rate(good);
    const result = store.getState().rate({ ...good, ...patch });
    expect(result.ok).toBe(false);
    expect(store.getState().ratings).toEqual([good]);
  });

  it('keeps the last receipt and resets everything', () => {
    const store = createSupportStore();
    store.getState().setLastReceipt({
      sessionId: 'demo-1',
      venueId: 'grind',
      venueName: 'The Grind Co-Work',
      seatId: 'grind-seat-8',
      seatLabel: 'Seat 8',
      seatKind: 'booth',
      mode: 'METERED_OPEN',
      minutes: 30,
      time: 20000,
      items: 0,
      total: 20000,
      orders: [],
    });
    expect(store.getState().lastReceipt?.sessionId).toBe('demo-1');
    store.getState().callStaff(ctx);
    store.getState().reset();
    expect(store.getState().lastReceipt).toBeNull();
    expect(store.getState().requests).toHaveLength(0);
  });
});

describe('venue info', () => {
  it('has wifi and 3 rules for each known venue', () => {
    for (const id of ['grind', 'matcha', 'cyber']) {
      const info = getVenueInfo(id);
      expect(info.wifiName).toBeTruthy();
      expect(info.wifiAccess).toBeTruthy();
      expect(info.rules).toHaveLength(3);
    }
  });
  it('falls back for an unknown venue', () => {
    expect(getVenueInfo('unknown').rules).toHaveLength(3);
  });
});

const visit = {
  sessionId: 'demo-1',
  venueId: 'grind',
  seatId: 'grind-seat-8',
  total: 20000,
  minutes: 30,
};

describe('refund request', () => {
  it('requires a reason of at most 300 characters', () => {
    const store = createSupportStore();
    expect(store.getState().requestRefund(visit, '').ok).toBe(false);
    expect(store.getState().requestRefund(visit, '   ').ok).toBe(false);
    expect(
      store.getState().requestRefund(visit, 'x'.repeat(MAX_REFUND_REASON + 1))
        .ok,
    ).toBe(false);
    expect(store.getState().refunds).toHaveLength(0);
    expect(store.getState().requests).toHaveLength(0);
    expect(
      store.getState().requestRefund(visit, 'x'.repeat(MAX_REFUND_REASON)).ok,
    ).toBe(true);
  });

  it('creates a requested refund and a mandatory payment support item', () => {
    const store = createSupportStore();
    const result = store.getState().requestRefund(visit, '  Wrong total  ');
    expect(result.ok).toBe(true);
    const { refunds, requests } = store.getState();
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({
      sessionId: 'demo-1',
      amount: 20000,
      reason: 'Wrong total',
      status: 'requested',
    });
    expect(requests).toHaveLength(1);
    const item = requests[0];
    expect(item?.id).toBe(refunds[0]?.supportRequestId);
    expect(item).toMatchObject({ kind: 'refund', sessionId: 'demo-1' });
    expect(item?.classification).toMatchObject({
      category: 'payment',
      needsStaff: true,
    });
    expect(mustEscalate(item!.classification!)).toBe(true);
  });

  it('allows one open request per session', () => {
    const store = createSupportStore();
    expect(store.getState().requestRefund(visit, 'one').ok).toBe(true);
    expect(store.getState().requestRefund(visit, 'two').ok).toBe(false);
    expect(store.getState().refunds).toHaveLength(1);
    expect(
      store.getState().requestRefund({ ...visit, sessionId: 'demo-2' }, 'ok')
        .ok,
    ).toBe(true);
    expect(
      openRefundForSession(store.getState().refunds, 'demo-1')?.reason,
    ).toBe('one');
  });

  it('can be withdrawn while requested, then asked again', () => {
    const store = createSupportStore();
    store.getState().requestRefund(visit, 'one');
    const id = store.getState().refunds[0]?.id ?? '';
    expect(store.getState().withdrawRefund(id).ok).toBe(true);
    expect(store.getState().refunds[0]?.status).toBe('withdrawn');
    expect(store.getState().requests[0]?.status).toBe('resolved');
    expect(store.getState().withdrawRefund(id).ok).toBe(false);
    expect(store.getState().withdrawRefund('missing').ok).toBe(false);
    expect(
      openRefundForSession(store.getState().refunds, 'demo-1'),
    ).toBeUndefined();
    expect(store.getState().requestRefund(visit, 'again').ok).toBe(true);
    expect(
      latestRefundForSession(store.getState().refunds, 'demo-1')?.reason,
    ).toBe('again');
  });

  it('rejects unknown visits and zero totals', () => {
    const store = createSupportStore();
    const bad = [
      { ...visit, venueId: 'nope' },
      { ...visit, sessionId: '' },
      { ...visit, total: 0 },
      { ...visit, total: 1.5 },
    ];
    for (const entry of bad)
      expect(store.getState().requestRefund(entry, 'x').ok).toBe(false);
    expect(store.getState().refunds).toHaveLength(0);
  });

  it('never shows "refunded" in any status text and explains the demo', () => {
    for (const label of Object.values(REFUND_STATUS_LABEL))
      expect(label.toLowerCase()).not.toContain('refunded');
    expect(REFUND_STATUS_LABEL.requested).toMatch(/manager review/);
    expect(REFUND_NOTICE.toLowerCase()).not.toContain('refunded');
    expect(REFUND_NOTICE).toMatch(
      /only confirmed once the money has been returned/,
    );
    expect(Object.keys(REFUND_STATUS_LABEL).sort()).toEqual([
      'requested',
      'withdrawn',
    ]);
  });

  it('resets refunds', () => {
    const store = createSupportStore();
    store.getState().requestRefund(visit, 'one');
    store.getState().reset();
    expect(store.getState().refunds).toHaveLength(0);
    expect(store.getState().nextRefundId).toBe(1);
  });
});

describe('seat-change request', () => {
  it('creates a seat_change request with a preferred kind and reason', () => {
    const store = createSupportStore();
    const result = store
      .getState()
      .requestSeatChange(ctx, { preferredKind: 'pod', reason: ' too loud ' });
    expect(result.ok).toBe(true);
    expect(store.getState().requests[0]).toMatchObject({
      kind: 'seat_change',
      preferredKind: 'pod',
      status: 'open',
      sessionId: 'demo-1',
    });
    expect(store.getState().requests[0]?.text).toContain('too loud');
    expect(store.getState().requests[0]?.classification?.needsStaff).toBe(true);
  });

  it('defaults to any seat and allows an empty reason', () => {
    const store = createSupportStore();
    expect(store.getState().requestSeatChange(ctx, {}).ok).toBe(true);
    expect(store.getState().requests[0]?.preferredKind).toBe('any');
    expect(validateOptionalReason(undefined)).toEqual({ ok: true, text: '' });
  });

  it('validates kind, reason length, session and seat', () => {
    const store = createSupportStore();
    expect(
      store
        .getState()
        .requestSeatChange(ctx, { preferredKind: 'sofa' as never }).ok,
    ).toBe(false);
    expect(
      store
        .getState()
        .requestSeatChange(ctx, { reason: 'r'.repeat(MAX_NOTE_LENGTH + 1) }).ok,
    ).toBe(false);
    expect(
      store.getState().requestSeatChange({ ...ctx, sessionId: null }, {}).ok,
    ).toBe(false);
    expect(
      store
        .getState()
        .requestSeatChange({ ...ctx, seatId: 'matcha-seat-1' }, {}).ok,
    ).toBe(false);
    expect(store.getState().requests).toHaveLength(0);
  });

  it('keeps existing request kinds working and says only staff can move you', () => {
    const store = createSupportStore();
    store.getState().callStaff(ctx);
    store.getState().reportSeatIssue(ctx, 'wifi_weak');
    store.getState().requestSeatChange(ctx, {});
    expect(store.getState().requests.map((r) => r.kind)).toEqual([
      'call_staff',
      'seat_issue',
      'seat_change',
    ]);
    expect(SEAT_CHANGE_NOTE).toMatch(/Only a team member can move you/);
  });
});
