import { describe, expect, it } from 'vitest';
import { createAppStore } from '../src/core';
import { activeSessionMessages } from '../src/features/customer/activeSessionMessages';
import {
  formatModifiers,
  iceLabel,
  milkLabel,
  sweetnessLabel,
  type Modifiers,
} from '../src/features/customer/cart/cartModel';
import { createCartStore } from '../src/features/customer/cart/cartStore';
import { cartMessages, cartText } from '../src/features/customer/cart/messages';
import {
  announcement,
  breakSuggestion,
  focusReducer,
  initialFocusState,
  phaseLabel,
} from '../src/features/customer/focus/focusModel';
import { focusMessages } from '../src/features/customer/focus/messages';
import { networkMessages } from '../src/features/customer/network/messages';
import {
  OFFLINE_MESSAGE,
  blockWhenOffline,
} from '../src/features/customer/network/networkModel';
import type { Messages } from '../src/i18n/i18n';

const drink = { id: 'grind-drink', name: 'Cold brew', price: 45000 };
const mods: Modifiers = { milk: 'oat', sweetness: 30, ice: 'less' };

const tables: [string, Messages<string>][] = [
  ['cart', cartMessages],
  ['focus', focusMessages],
  ['network', networkMessages],
  ['active session', activeSessionMessages],
];

describe('message tables', () => {
  it.each(tables)(
    '%s has a non-empty Vietnamese value for every key',
    (_, m) => {
      expect(Object.keys(m.vi).sort()).toEqual(Object.keys(m.en).sort());
      for (const [key, value] of Object.entries(m.vi))
        expect(value.trim(), key).not.toBe('');
    },
  );
  it('keeps the exact English offline text', () => {
    expect(OFFLINE_MESSAGE).toBe(
      "You're offline. Ordering and ending your session are paused until you reconnect.",
    );
  });
});

describe('cart model labels', () => {
  it('stay English by default', () => {
    expect(formatModifiers(mods)).toBe('Oat milk · 30% sugar · Less ice');
    expect(milkLabel('none')).toBe('No milk');
    expect(sweetnessLabel(0)).toBe('0% sugar');
    expect(iceLabel('normal')).toBe('Normal ice');
    expect(formatModifiers(null)).toBe('');
  });
  it('are Vietnamese for vi', () => {
    expect(formatModifiers(mods, 'vi')).toBe(
      'Sữa yến mạch · 30% đường · Ít đá',
    );
    expect(milkLabel('dairy', 'vi')).toBe('Sữa tươi');
    expect(iceLabel('none', 'vi')).toBe('Không đá');
    expect(formatModifiers(null, 'vi')).toBe('');
  });
});

describe('cart store messages', () => {
  function started() {
    const core = createAppStore();
    core.getState().selectSeat('grind-seat-8');
    core.getState().startSession('METERED_OPEN');
    const cart = createCartStore(core);
    const session = () =>
      core.getState().sessions.find((s) => s.id === 'demo-1')!;
    return { cart, session };
  }
  it('keeps the English text and adds a translatable code', () => {
    const { cart, session } = started();
    expect(cart.getState().submit(session()).ok).toBe(false);
    const { error, errorMessage } = cart.getState();
    expect(error).toBe('Your cart is empty.');
    expect(errorMessage).toEqual({ key: 'emptyCart' });
    expect(cartText(errorMessage!, 'vi')).toBe('Giỏ hàng của bạn đang trống.');
  });
  it('renders the order notice in both languages and clears both fields', () => {
    const { cart, session } = started();
    cart.getState().addItem(drink);
    cart.getState().submit(session());
    const { notice, noticeMessage } = cart.getState();
    expect(notice).toBe('Order placed.');
    expect(cartText(noticeMessage!)).toBe('Order placed.');
    expect(cartText(noticeMessage!, 'vi')).toBe('Đã đặt món.');
    cart.getState().dismissMessages();
    expect(cart.getState().notice).toBeNull();
    expect(cart.getState().noticeMessage).toBeNull();
  });
  it('carries parameters for dropped items and allergy failures', () => {
    expect(
      cartText(
        { key: 'orderPlacedDropped', params: { names: 'Gone cake' } },
        'vi',
      ),
    ).toBe('Đã đặt món. Không còn phục vụ: Gone cake.');
    expect(cartText({ key: 'allergyFailedUnavailable' }, 'vi')).toContain(
      'ghi chú dị ứng',
    );
    expect(
      cartText({ key: 'allergyFailedReason', params: { reason: 'x' } }),
    ).toContain('(x)');
  });
});

describe('focus model', () => {
  it('keeps English by default and translates for vi', () => {
    expect(phaseLabel('work')).toBe('Focus');
    expect(phaseLabel('idle', 'vi')).toBe('Sẵn sàng');
    expect(breakSuggestion(null)).toBe(
      'Stand up, stretch and rest your eyes for a few minutes.',
    );
    expect(breakSuggestion({ milk: 'oat', sweetness: 30 }, 'vi')).toContain(
      'sữa yến mạch, 30% ngọt',
    );
    expect(breakSuggestion(null, 'vi')).toContain('vươn vai');
  });
  it('announces changes in both languages', () => {
    const started = focusReducer(initialFocusState(), {
      type: 'start',
      nowMs: 0,
    });
    expect(announcement(started)).toBe('Focus time started: 25 minutes.');
    expect(announcement(started, 'vi')).toBe(
      'Bắt đầu thời gian tập trung: 25 phút.',
    );
    const brk = focusReducer(started, { type: 'tick', nowMs: 25 * 60000 });
    expect(announcement(brk)).toBe(
      'Break time: 5 minutes. 1 focus block done.',
    );
    expect(announcement(brk, 'vi')).toBe(
      'Đến giờ nghỉ: 5 phút. Đã xong 1 khối tập trung.',
    );
    expect(announcement(initialFocusState(), 'vi')).toBe('');
  });
});

describe('network model', () => {
  it('blocks with the message in the requested language', () => {
    expect(blockWhenOffline(true, 'vi')).toBeNull();
    expect(blockWhenOffline(false)).toBe(OFFLINE_MESSAGE);
    expect(blockWhenOffline(false, 'vi')).toBe(networkMessages.vi.offline);
    expect(blockWhenOffline(false, 'vi')).not.toBe(OFFLINE_MESSAGE);
  });
});

describe('session header', () => {
  it('shows the raw mode in English and a readable one in Vietnamese', () => {
    expect(activeSessionMessages.en.modeMeteredOpen).toBe('METERED_OPEN');
    expect(activeSessionMessages.vi.modeMeteredOpen).toBe('Tính theo giờ');
    expect(activeSessionMessages.vi.modeBundle2h).toBe('Gói 2 giờ');
  });
});
