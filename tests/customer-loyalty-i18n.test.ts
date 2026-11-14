import { describe, expect, it } from 'vitest';
import {
  allergyNotice,
  checkFriendCode,
  defaultPreferences,
  initialLoyaltyState,
  joinProgramme,
  referralCode,
  requestOtp,
  setPreferences,
  toggleFavourite,
} from '../src/features/customer/loyalty/loyaltyModel';
import { createLoyaltyStore } from '../src/features/customer/loyalty/loyaltyStore';
import {
  LOAD_WARNING_FAILED,
  LOAD_WARNING_INCOMPATIBLE,
  loyaltyMessages,
  loyaltyWarningText,
} from '../src/features/customer/loyalty/messages';

const valid = { phone: '0901234567', code: '123456', consent: true };
const message = (result: { ok: boolean; message?: string }) =>
  result.ok ? '' : (result.message ?? '');

describe('loyalty i18n', () => {
  it('has a non-empty Vietnamese value for every key', () => {
    for (const [key, value] of Object.entries(loyaltyMessages.vi))
      expect(value.trim(), key).not.toBe('');
  });
  it('keeps English errors by default and translates for vi', () => {
    const base = initialLoyaltyState();
    expect(message(requestOtp('12'))).toBe(
      'Enter a 10 digit mobile number starting with 0.',
    );
    expect(message(requestOtp('12', 'vi'))).toBe(
      'Hãy nhập số điện thoại di động 10 chữ số, bắt đầu bằng số 0.',
    );
    expect(message(joinProgramme(base, 'nowhere', valid))).toBe(
      'Unknown venue.',
    );
    expect(message(joinProgramme(base, 'nowhere', valid, 'vi'))).toBe(
      'Không tìm thấy quán.',
    );
    expect(
      message(joinProgramme(base, 'grind', { ...valid, code: '1' }, 'vi')),
    ).toBe('Mã chưa đúng. Hãy thử lại.');
    expect(
      message(joinProgramme(base, 'grind', { ...valid, consent: false })),
    ).toBe('Please agree to the data use above to join.');
    expect(
      message(joinProgramme(base, 'grind', { ...valid, phone: '1' }, 'vi')),
    ).toContain('số điện thoại');
  });
  it('translates referral code errors', () => {
    expect(message(checkFriendCode('grind', valid.phone, 'nonsense'))).toBe(
      "That friend's code is not valid.",
    );
    expect(
      message(checkFriendCode('grind', valid.phone, 'nonsense', 'vi')),
    ).toBe('Mã của bạn bè không hợp lệ.');
    const own = referralCode('grind', valid.phone);
    expect(message(checkFriendCode('grind', valid.phone, own, 'vi'))).toBe(
      'Bạn không thể dùng mã giới thiệu của chính mình.',
    );
    const other = referralCode('matcha', '0907654321');
    expect(message(checkFriendCode('grind', valid.phone, other, 'vi'))).toBe(
      'Mã này thuộc chương trình của quán khác.',
    );
  });
  it('translates preference and pin errors', () => {
    const base = initialLoyaltyState();
    expect(message(setPreferences(base, 'grind', defaultPreferences()))).toBe(
      'Join the programme to save preferences.',
    );
    expect(
      message(setPreferences(base, 'grind', defaultPreferences(), 'vi')),
    ).toBe('Hãy tham gia chương trình để lưu tuỳ chọn.');
    expect(message(toggleFavourite(base, 'grind', 'matcha-seat-1'))).toBe(
      'That seat is not in this venue.',
    );
    expect(message(toggleFavourite(base, 'grind', 'matcha-seat-1', 'vi'))).toBe(
      'Chỗ này không thuộc quán này.',
    );
    let state = base;
    for (const n of [1, 2, 3]) {
      const next = toggleFavourite(state, 'grind', `grind-seat-${n}`);
      if (!next.ok) throw new Error(next.message);
      state = next.state;
    }
    expect(message(toggleFavourite(state, 'grind', 'grind-seat-4'))).toBe(
      'You can pin up to 3 seats. Unpin one first.',
    );
    expect(message(toggleFavourite(state, 'grind', 'grind-seat-4', 'vi'))).toBe(
      'Bạn chỉ có thể ghim tối đa 3 chỗ. Hãy bỏ ghim một chỗ trước.',
    );
  });
  it('translates the allergy notice', () => {
    const prefs = { ...defaultPreferences(), allergyNote: 'peanuts' };
    expect(allergyNotice(prefs)).toBe(
      'Staff will always be notified about allergies',
    );
    expect(allergyNotice(prefs, 'vi')).toBe(
      'Nhân viên sẽ luôn được thông báo về dị ứng',
    );
    expect(allergyNotice(defaultPreferences(), 'vi')).toBeNull();
  });
  it('store actions pass the language through to error messages', () => {
    const store = createLoyaltyStore();
    expect(store.getState().join('grind', { ...valid, code: '0' })).toEqual({
      ok: false,
      message: 'The code is not correct. Try again.',
    });
    expect(
      store.getState().join('grind', { ...valid, code: '0' }, 'vi'),
    ).toEqual({ ok: false, message: 'Mã chưa đúng. Hãy thử lại.' });
    expect(
      store.getState().toggleFavourite('grind', 'matcha-seat-1', 'vi'),
    ).toEqual({ ok: false, message: 'Chỗ này không thuộc quán này.' });
  });
  it('translates the load warnings and leaves unknown ones alone', () => {
    expect(loyaltyWarningText(LOAD_WARNING_INCOMPATIBLE, 'en')).toBe(
      LOAD_WARNING_INCOMPATIBLE,
    );
    expect(loyaltyWarningText(LOAD_WARNING_INCOMPATIBLE, 'vi')).toContain(
      'không tương thích',
    );
    expect(loyaltyWarningText(LOAD_WARNING_FAILED, 'vi')).toContain(
      'Không thể tải',
    );
    expect(loyaltyWarningText('Other', 'vi')).toBe('Other');
  });
});
