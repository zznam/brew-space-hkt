import { describe, expect, it, vi } from 'vitest';
import { createAppStore, getVenue } from '../src/core';
import {
  addToCart,
  allergyRequestText,
  cartTotal,
  defaultModifiers,
  formatModifiers,
  isDrink,
  lineKey,
  normaliseSearch,
  searchMenu,
  setModifiers,
  type Modifiers,
} from '../src/features/customer/cart/cartModel';
import {
  createCartStore,
  type CartDeps,
} from '../src/features/customer/cart/cartStore';
import {
  defaultPreferences,
  type Preferences,
} from '../src/features/customer/loyalty/loyaltyModel';
import { MAX_NOTE_LENGTH } from '../src/features/customer/support/supportModel';
import { createSupportStore } from '../src/features/customer/support/supportStore';

const drink = { id: 'grind-drink', name: 'Oat matcha', price: 45000 };
const snack = { id: 'grind-snack', name: 'Butter croissant', price: 35000 };
const oat30: Modifiers = { milk: 'oat', sweetness: 30, ice: 'less' };

function started(deps: CartDeps = {}) {
  const core = createAppStore();
  core.getState().selectSeat('grind-seat-8');
  expect(core.getState().startSession('METERED_OPEN').ok).toBe(true);
  const cart = createCartStore(core, deps);
  const session = () =>
    core.getState().sessions.find((s) => s.id === 'demo-1')!;
  return { core, cart, session };
}
const member = (patch: Partial<Preferences> = {}): CartDeps => ({
  getSavedPreferences: () => ({ ...defaultPreferences(), ...patch }),
});

describe('drink vs food rule', () => {
  it('treats ids ending in -drink as drinks, everything else as food', () => {
    expect(isDrink(drink)).toBe(true);
    expect(isDrink(snack)).toBe(false);
    expect(isDrink({ id: 'drink-special' })).toBe(false);
    // Every seeded venue follows the convention.
    for (const id of ['grind', 'matcha', 'cyber']) {
      const menu = getVenue(id).menu;
      expect(menu.filter(isDrink)).toHaveLength(1);
    }
  });
  it('gives food lines no modifiers even if some are passed', () => {
    const lines = addToCart([], snack, oat30);
    expect(lines[0]?.modifiers).toBeNull();
    expect(lineKey(lines[0]!)).toBe(snack.id);
  });
});

describe('modifier lines', () => {
  it('merges identical modifiers and splits different ones', () => {
    let lines = addToCart([], drink, oat30);
    lines = addToCart(lines, drink, oat30);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
    lines = addToCart(lines, drink, { ...oat30, sweetness: 100 });
    expect(lines).toHaveLength(2);
    expect(new Set(lines.map(lineKey)).size).toBe(2);
    expect(lineKey(lines[0]!)).toBe('grind-drink|oat|30|less');
  });
  it('starts drinks from guest defaults', () => {
    expect(addToCart([], drink)[0]?.modifiers).toEqual(defaultModifiers());
    expect(defaultModifiers()).toEqual({
      milk: 'none',
      sweetness: 50,
      ice: 'normal',
    });
  });
  it('changes options and merges into an existing twin line', () => {
    let lines = addToCart(addToCart([], drink, oat30), drink, {
      ...oat30,
      ice: 'none',
    });
    expect(lines).toHaveLength(2);
    const second = lineKey(lines[1]!);
    lines = setModifiers(lines, second, { ice: 'less' });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
    expect(lines[0]?.modifiers).toEqual(oat30);
    // Plain change without a twin keeps one line.
    lines = setModifiers(lines, lineKey(lines[0]!), { milk: 'almond' });
    expect(lines[0]?.modifiers?.milk).toBe('almond');
  });
  it('ignores invalid patches and food lines', () => {
    const lines = addToCart(addToCart([], drink), snack);
    const key = lineKey(lines[0]!);
    expect(
      setModifiers(lines, key, { sweetness: 42 as Modifiers['sweetness'] }),
    ).toBe(lines);
    expect(setModifiers(lines, snack.id, { milk: 'oat' })).toBe(lines);
    expect(setModifiers(lines, 'missing', { milk: 'oat' })).toBe(lines);
  });
  it('never changes the price', () => {
    const plain = addToCart([], drink);
    const fancy = addToCart([], drink, {
      milk: 'almond',
      sweetness: 0,
      ice: 'none',
    });
    expect(cartTotal(fancy)).toBe(cartTotal(plain));
  });
  it('formats labels', () => {
    expect(formatModifiers(oat30)).toBe('Oat milk · 30% sugar · Less ice');
    expect(
      formatModifiers({ milk: 'none', sweetness: 100, ice: 'normal' }),
    ).toBe('No milk · 100% sugar · Normal ice');
    expect(formatModifiers(null)).toBe('');
  });
});

describe('cart store modifiers and prefill', () => {
  it('prefills drinks (not food) for a member and flags it', () => {
    const { cart } = started(member({ milk: 'oat', sweetness: 30 }));
    cart.getState().addItem(drink);
    cart.getState().addItem(snack);
    const [first, second] = cart.getState().lines;
    expect(first?.modifiers).toEqual({
      milk: 'oat',
      sweetness: 30,
      ice: 'normal',
    });
    expect(second?.modifiers).toBeNull();
    expect(cart.getState().prefilled).toBe(true);
    cart.getState().removeLine(lineKey(first!));
    cart.getState().removeLine(snack.id);
    expect(cart.getState().prefilled).toBe(false);
  });
  it('gives guests defaults and no prefill flag', () => {
    const { cart } = started({ getSavedPreferences: () => null });
    cart.getState().addItem(drink);
    expect(cart.getState().lines[0]?.modifiers).toEqual(defaultModifiers());
    expect(cart.getState().prefilled).toBe(false);
    const { cart: bare } = started();
    bare.getState().addItem(drink);
    expect(bare.getState().prefilled).toBe(false);
  });
  it('edits modifiers in the store and keeps them on the placed order', () => {
    const { cart, session } = started();
    cart.getState().addItem(drink);
    cart.getState().setModifiers(lineKey(cart.getState().lines[0]!), oat30);
    cart.getState().addItem(drink); // default line, separate from oat30
    expect(cart.getState().lines).toHaveLength(2);
    expect(cart.getState().submit(session()).ok).toBe(true);
    const [order] = cart.getState().orders;
    expect(order?.lines.map((l) => formatModifiers(l.modifiers))).toEqual([
      'Oat milk · 30% sugar · Less ice',
      'No milk · 50% sugar · Normal ice',
    ]);
    // Core prices stay at the menu price: 2 units on the bill.
    expect(session().orders).toHaveLength(2);
  });
  it('reorder keeps modifiers per line', () => {
    const { cart, session } = started();
    cart.getState().addItem(drink);
    cart.getState().setModifiers(lineKey(cart.getState().lines[0]!), oat30);
    cart.getState().submit(session());
    expect(cart.getState().reorder(session()).ok).toBe(true);
    const orders = cart.getState().orders;
    expect(orders).toHaveLength(2);
    expect(orders[1]?.lines[0]?.modifiers).toEqual(oat30);
  });
});

describe('allergy safety', () => {
  const asSupport = () => {
    const support = createSupportStore();
    const notifyStaff: NonNullable<CartDeps['notifyStaff']> = (ctx, text) =>
      support.getState().submitNote(ctx, text);
    return { support, notifyStaff };
  };

  it('raises a staff request on submit with the order summary', () => {
    const { support, notifyStaff } = asSupport();
    const { cart, session } = started({
      ...member({ allergyNote: ' peanuts ' }),
      notifyStaff,
    });
    cart.getState().addItem({ ...drink, name: 'Oat matcha' });
    cart.getState().addItem(drink);
    expect(cart.getState().submit(session()).ok).toBe(true);
    const requests = support.getState().requests;
    expect(requests).toHaveLength(1);
    // The core menu name is authoritative, so read it back for the assertion.
    const name = getVenue('grind').menu.find((m) => m.id === drink.id)!.name;
    expect(requests[0]?.text).toBe(
      `Allergy on file: peanuts. Order: 2 × ${name}`,
    );
    expect(requests[0]?.kind).toBe('note');
    expect(requests[0]?.classification?.category).toBe('allergy');
    expect(requests[0]?.sessionId).toBe('demo-1');
    expect(cart.getState().warning).toBeNull();
  });
  it('raises a request on every reorder too', () => {
    const { support, notifyStaff } = asSupport();
    const { cart, session } = started({
      ...member({ allergyNote: 'peanuts' }),
      notifyStaff,
    });
    cart.getState().addItem(drink);
    cart.getState().submit(session());
    expect(cart.getState().reorder(session()).ok).toBe(true);
    expect(support.getState().requests).toHaveLength(2);
    expect(support.getState().requests[1]?.text).toContain('1 × ');
  });
  it('does nothing without an allergy note or for guests', () => {
    const notifyStaff = vi.fn(() => ({ ok: true as const }));
    for (const deps of [
      member({ allergyNote: '   ' }),
      { getSavedPreferences: () => null },
    ]) {
      const { cart, session } = started({ ...deps, notifyStaff });
      cart.getState().addItem(drink);
      cart.getState().submit(session());
    }
    expect(notifyStaff).not.toHaveBeenCalled();
  });
  it('still places the order and warns when the notifier fails or throws', () => {
    for (const notifyStaff of [
      () => ({ ok: false as const, message: 'Unknown seat for this venue.' }),
      () => {
        throw new Error('boom');
      },
    ]) {
      const { cart, session } = started({
        ...member({ allergyNote: 'peanuts' }),
        notifyStaff,
      });
      cart.getState().addItem(drink);
      expect(cart.getState().submit(session()).ok).toBe(true);
      expect(session().orders).toHaveLength(1);
      expect(cart.getState().orders).toHaveLength(1);
      expect(cart.getState().notice).toBe('Order placed.');
      expect(cart.getState().warning).toContain(
        'allergy note could not be sent',
      );
      cart.getState().dismissMessages();
      expect(cart.getState().warning).toBeNull();
      // Same for reorder.
      expect(cart.getState().reorder(session()).ok).toBe(true);
      expect(cart.getState().warning).toContain(
        'allergy note could not be sent',
      );
    }
  });
  it('warns when there is an allergy but no notifier wired', () => {
    const { cart, session } = started(member({ allergyNote: 'peanuts' }));
    cart.getState().addItem(drink);
    expect(cart.getState().submit(session()).ok).toBe(true);
    expect(cart.getState().warning).not.toBeNull();
  });
  it('keeps the request within the support note limit', () => {
    const note = 'a'.repeat(120);
    const lines = Array.from({ length: 30 }, (_, i) => ({
      name: `Very long item name number ${i}`,
      quantity: 20,
    }));
    const text = allergyRequestText(note, lines);
    expect(text.length).toBeLessThanOrEqual(MAX_NOTE_LENGTH);
    expect(text.startsWith(`Allergy on file: ${note}.`)).toBe(true);
    expect(allergyRequestText('nuts', [])).toBe('Allergy on file: nuts.');
  });
});

describe('menu search', () => {
  const menu = [
    { id: 'a', name: 'Cà phê sữa đá', price: 1 },
    { id: 'b', name: 'Butter croissant', price: 1 },
    { id: 'c', name: 'Matcha Latte', price: 1 },
  ];
  it('normalises case, diacritics and spaces', () => {
    expect(normaliseSearch('  CÀ   Phê  Sữa Đá ')).toBe('ca phe sua da');
    expect(normaliseSearch('Đường')).toBe('duong');
  });
  it('matches substrings regardless of case and diacritics', () => {
    expect(searchMenu(menu, 'CA PHE').map((i) => i.id)).toEqual(['a']);
    expect(searchMenu(menu, 'sữa').map((i) => i.id)).toEqual(['a']);
    expect(searchMenu(menu, 'da').map((i) => i.id)).toEqual(['a']);
    expect(searchMenu(menu, 'TTER').map((i) => i.id)).toEqual(['b']);
    expect(searchMenu(menu, 'latte')).toHaveLength(1);
  });
  it('returns the whole menu for a blank query and nothing for no match', () => {
    expect(searchMenu(menu, '')).toBe(menu);
    expect(searchMenu(menu, '   ')).toBe(menu);
    expect(searchMenu(menu, 'pizza')).toEqual([]);
  });
});
