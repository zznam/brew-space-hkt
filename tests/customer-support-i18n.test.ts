import { describe, expect, it } from 'vitest';
import { supportMessages } from '../src/features/customer/support/messages';
import {
  REFUND_NOTICE,
  REFUND_STATUS_LABEL,
  refundNotice,
  refundStatusLabel,
  validateRefundReason,
} from '../src/features/customer/support/refundModel';
import {
  MAX_NOTE_LENGTH,
  REQUEST_STATUS_LABEL,
  SEAT_CHANGE_NOTE,
  SEAT_ISSUE_PRESETS,
  SEAT_PREFERENCES,
  classifyNote,
  errorText,
  failureText,
  priorityLabel,
  requestDisplayText,
  requestStatusLabel,
  seatIssueLabel,
  seatLabelText,
  seatPreferenceLabel,
  supportText,
  timeStatus,
  validateNote,
  validateOptionalReason,
  type RequestStatus,
  type SupportRequest,
} from '../src/features/customer/support/supportModel';
import {
  createSupportStore,
  type SupportContext,
} from '../src/features/customer/support/supportStore';
import { getVenueInfo } from '../src/features/customer/support/venueInfo';

const ctx: SupportContext = {
  venueId: 'grind',
  seatId: 'grind-seat-8',
  sessionId: 'demo-1',
  minute: 10,
};

describe('support message table', () => {
  it('has a non-empty Vietnamese value for every English key', () => {
    for (const key of Object.keys(supportMessages.en)) {
      const vi = (supportMessages.vi as Record<string, string>)[key];
      expect(vi, key).toBeTruthy();
      expect(vi?.trim(), key).not.toBe('');
    }
  });
  it('keeps the same placeholders in both languages', () => {
    const names = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, en] of Object.entries(supportMessages.en))
      expect(
        names((supportMessages.vi as Record<string, string>)[key] ?? ''),
        key,
      ).toEqual(names(en));
  });
  it('keeps English identical to the model constants', () => {
    expect(supportMessages.en.seatChangeNote).toBe(SEAT_CHANGE_NOTE);
    expect(supportMessages.en.refundNotice).toBe(REFUND_NOTICE);
    for (const status of ['open', 'acknowledged', 'resolved'] as const)
      expect(requestStatusLabel(status)).toBe(REQUEST_STATUS_LABEL[status]);
    for (const status of ['requested', 'withdrawn'] as const)
      expect(refundStatusLabel(status)).toBe(REFUND_STATUS_LABEL[status]);
    for (const preset of SEAT_PRESETS_FOR_TEST)
      expect(seatIssueLabel(preset)).toBe(preset.label);
    for (const option of SEAT_PREFERENCES)
      expect(seatPreferenceLabel(option.id)).toBe(option.label);
  });
});

const SEAT_PRESETS_FOR_TEST = SEAT_ISSUE_PRESETS;

describe('labels and status text', () => {
  it('translates statuses, priorities, presets and preferences', () => {
    expect(requestStatusLabel('open', 'vi')).toBe('Đang mở - chờ nhân viên');
    for (const status of [
      'open',
      'acknowledged',
      'resolved',
    ] as RequestStatus[])
      expect(requestStatusLabel(status, 'vi')).not.toBe(
        REQUEST_STATUS_LABEL[status],
      );
    expect(priorityLabel('urgent')).toBe('urgent');
    expect(priorityLabel('urgent', 'vi')).toBe('khẩn cấp');
    for (const preset of SEAT_ISSUE_PRESETS)
      expect(seatIssueLabel(preset, 'vi')).not.toBe(preset.label);
    expect(seatPreferenceLabel('desk', 'vi')).toBe('Bàn đơn');
    expect(seatPreferenceLabel('pod', 'vi')).toBe('Buồng riêng');
    expect(seatPreferenceLabel('booth', 'vi')).toBe('Bàn nhóm');
  });
  it('shows core seat labels as Chỗ only in Vietnamese', () => {
    expect(seatLabelText('Seat 3')).toBe('Seat 3');
    expect(seatLabelText('Seat 3', 'vi')).toBe('Chỗ 3');
  });
  it('translates refund labels and notice', () => {
    expect(refundStatusLabel('requested', 'vi')).toMatch(/quản lý/);
    expect(refundNotice('vi')).toMatch(/demo/);
    expect(refundNotice()).toBe(REFUND_NOTICE);
  });
});

describe('time status in Vietnamese', () => {
  it('keeps English as the default', () => {
    expect(timeStatus({ mode: 'BUNDLE_2H', elapsedMinutes: 100 }).message).toBe(
      '20 minutes left in your 2-hour bundle.',
    );
    expect(
      timeStatus({ mode: 'METERED_OPEN', elapsedMinutes: 1 }).message,
    ).toBe(
      '1 minute so far. Seat time is billed in 15-minute blocks; the current block ends in 14 minutes.',
    );
  });
  it('covers every state in Vietnamese with the same numbers', () => {
    const at = (mode: 'BUNDLE_2H' | 'BUNDLE_4H' | 'METERED_OPEN', n: number) =>
      timeStatus({ mode, elapsedMinutes: n }, 'vi');
    expect(at('BUNDLE_2H', 100).message).toBe(
      'Còn 20 phút trong gói 2 giờ của bạn.',
    );
    expect(at('BUNDLE_2H', 110).message).toBe(
      'Còn 10 phút trong gói 2 giờ của bạn. Phiên của bạn sẽ không tự kết thúc.',
    );
    expect(at('BUNDLE_4H', 240).message).toMatch(/Gói 4 giờ.*10 phút ân hạn/);
    expect(at('BUNDLE_2H', 140).message).toBe(
      'Bạn đã quá 20 phút so với gói 2 giờ. Thời gian thêm hiện được tính theo block 15 phút.',
    );
    expect(at('METERED_OPEN', 20).message).toMatch(/20 phút.*5 phút/);
    for (const message of [
      at('BUNDLE_2H', 100),
      at('BUNDLE_2H', 110),
      at('BUNDLE_2H', 120),
      at('BUNDLE_2H', 140),
      at('METERED_OPEN', 1),
    ].map((status) => status.message))
      expect(message).not.toMatch(/\b(left|minutes?|bundle|grace)\b/);
  });
  it('does not change the numbers when translated', () => {
    for (const minutes of [0, 15, 105, 119, 120, 125, 131, 250]) {
      const en = timeStatus({ mode: 'BUNDLE_2H', elapsedMinutes: minutes });
      const vi = timeStatus(
        { mode: 'BUNDLE_2H', elapsedMinutes: minutes },
        'vi',
      );
      expect({ ...vi, message: '' }).toEqual({ ...en, message: '' });
    }
  });
});

describe('error codes', () => {
  it('validators return a code that matches their English text', () => {
    const empty = validateNote('  ');
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.code).toBe('NOTE_EMPTY');
      expect(failureText(empty)).toBe(empty.message);
      expect(failureText(empty, 'vi')).toBe('Hãy viết một ghi chú ngắn trước.');
    }
    const long = validateNote('a'.repeat(MAX_NOTE_LENGTH + 1));
    if (!long.ok) expect(failureText(long)).toBe(long.message);
    const reason = validateOptionalReason('a'.repeat(MAX_NOTE_LENGTH + 1));
    if (!reason.ok) {
      expect(failureText(reason)).toBe(reason.message);
      expect(failureText(reason, 'vi')).toContain(String(MAX_NOTE_LENGTH));
    }
    const refund = validateRefundReason('');
    if (!refund.ok) expect(failureText(refund)).toBe(refund.message);
    expect(errorText('REFUND_ZERO', 'vi')).toMatch(/hoàn/);
  });
  it('store failures carry a code whose English text equals the message', () => {
    const store = createSupportStore();
    const results = [
      store.getState().submitNote(ctx, ''),
      store.getState().submitNote({ ...ctx, venueId: 'nope' }, 'hello'),
      store.getState().submitNote({ ...ctx, seatId: 'nope' }, 'hello'),
      store.getState().reportSeatIssue(ctx, 'nope'),
      store.getState().requestSeatChange(ctx, { preferredKind: 'x' as never }),
      store.getState().requestSeatChange({ ...ctx, sessionId: null }, {}),
      store.getState().requestRefund(
        {
          sessionId: 's1',
          venueId: 'grind',
          seatId: 'grind-seat-8',
          total: 0,
          minutes: 5,
        },
        'too slow',
      ),
      store.getState().withdrawRefund('nope'),
      store.getState().markResolved('nope'),
      store.getState().rate({
        sessionId: 's1',
        seat: 9,
        drinks: 1,
        service: 1,
        comment: '',
      }),
    ];
    for (const result of results) {
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.code).toBeTruthy();
      expect(failureText(result)).toBe(result.message);
      expect(failureText(result, 'vi')).not.toBe(result.message);
      expect(failureText(result, 'vi').trim()).not.toBe('');
    }
  });
});

describe('request display text', () => {
  const base: Omit<SupportRequest, 'kind' | 'text'> = {
    id: 'support-1',
    venueId: 'grind',
    seatId: 'grind-seat-8',
    sessionId: 'demo-1',
    classification: null,
    status: 'open',
    createdAtMinute: 0,
  };
  it('shows stored text unchanged in English', () => {
    const store = createSupportStore();
    store.getState().callStaff(ctx);
    store.getState().reportSeatIssue(ctx, 'wifi_weak');
    store
      .getState()
      .requestSeatChange(ctx, { preferredKind: 'pod', reason: 'too loud' });
    for (const request of store.getState().requests)
      expect(requestDisplayText(request)).toBe(request.text);
  });
  it('rebuilds app-generated text in Vietnamese', () => {
    const store = createSupportStore();
    store.getState().callStaff(ctx);
    store.getState().reportSeatIssue(ctx, 'wifi_weak');
    store
      .getState()
      .requestSeatChange(ctx, { preferredKind: 'pod', reason: 'too loud' });
    store.getState().requestSeatChange(ctx, {});
    store.getState().submitNote(ctx, 'Tôi dị ứng sữa');
    const texts = store
      .getState()
      .requests.map((request) => requestDisplayText(request, 'vi'));
    expect(texts).toEqual([
      'Gọi nhân viên',
      'Wi-Fi yếu',
      'Đổi chỗ (buồng riêng): too loud',
      'Đổi chỗ (bất kỳ)',
      'Tôi dị ứng sữa',
    ]);
  });
  it('translates the refund prefix and keeps unknown text', () => {
    expect(
      requestDisplayText(
        { ...base, kind: 'refund', text: 'Refund request: slow' },
        'vi',
      ),
    ).toBe('Yêu cầu hoàn tiền: slow');
    expect(
      requestDisplayText(
        { ...base, kind: 'seat_issue', text: 'Something else' },
        'vi',
      ),
    ).toBe('Something else');
  });
});

describe('venue info variants', () => {
  it('defaults to English and keeps the English fields intact', () => {
    const en = getVenueInfo('grind');
    expect(en.wifiAccess).toBe('Printed on the card at your table.');
    expect(getVenueInfo('grind', 'en')).toBe(en);
    expect(en.address).toContain('demo address');
  });
  it('swaps in Vietnamese text without touching the data fields', () => {
    for (const id of ['grind', 'matcha', 'cyber', 'unknown']) {
      const en = getVenueInfo(id);
      const vi = getVenueInfo(id, 'vi');
      expect(vi.wifiName).toBe(en.wifiName);
      expect(vi.hours).toEqual(en.hours);
      expect(vi.utcOffsetMinutes).toBe(en.utcOffsetMinutes);
      expect(vi.wifiAccess.trim()).not.toBe('');
      expect(vi.wifiAccess).not.toBe(en.wifiAccess);
      expect(vi.address).toContain('demo');
      expect(vi.rules).toHaveLength(3);
      vi.rules.forEach((rule, index) => {
        expect(rule.trim()).not.toBe('');
        expect(rule).not.toBe(en.rules[index]);
      });
    }
  });
});

describe('classifier is unchanged', () => {
  it('still labels Vietnamese and English notes the same way', () => {
    expect(classifyNote('Tôi bị dị ứng đậu phộng').category).toBe('allergy');
    expect(classifyNote('I want a refund').category).toBe('payment');
    expect(supportText('callStaff', 'vi')).toBe('Gọi nhân viên');
  });
});
