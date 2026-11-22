import { describe, expect, it } from 'vitest';
import {
  catalogueMenu,
  catalogueSnapshot,
  createCatalogueStore,
  posCatalogueMenu,
} from '../src/core/catalogue/store';
import { formInput, itemForm } from '../src/core/catalogue/form';
import {
  createAppStore,
  calculateBill,
  getVenue,
  type Venue,
} from '../src/core';
import { createCartStore } from '../src/features/customer/cart/cartStore';
import { createPosStore } from '../src/features/merchant/pos/posStore';

function setup() {
  const catalogue = createCatalogueStore();
  const venue = getVenue('grind');
  const menu = (id: string) =>
    catalogueMenu(catalogue.getState(), getVenue(id));
  const core = createAppStore((v) => menu(v.id));
  core.getState().selectSeat('grind-seat-8');
  expect(core.getState().startSession('METERED_OPEN').ok).toBe(true);
  const cart = createCartStore(core, { getMenu: menu });
  const session = () =>
    core.getState().sessions.find((s) => s.customerId === 'demo-guest')!;
  const drink = () =>
    catalogue.getState().items.find((i) => i.id === 'grind-grind-drink')!;
  return { catalogue, venue, menu, core, cart, session, drink };
}

describe('shared catalogue integration', () => {
  it('keeps fixture IDs, creates/renames categories and isolates venue menus', () => {
    const s = setup();
    expect(s.menu('grind')).toEqual(s.venue.menu);
    expect(
      s.catalogue.getState().saveCategory('grind', { name: 'Tea', sort: 1 }).ok,
    ).toBe(true);
    const category = s.catalogue
      .getState()
      .categories.find((c) => c.name === 'Tea')!;
    expect(
      s.catalogue.getState().saveCategory('grind', {
        id: category.id,
        name: 'Special tea',
        sort: 1,
      }).ok,
    ).toBe(true);
    expect(
      s.catalogue.getState().saveItem('grind', {
        name: 'Green tea',
        categoryId: category.id,
        kind: 'food_drink',
        price: 25000,
        sizes: [],
        modifierGroups: [],
        limited: false,
      }).ok,
    ).toBe(true);
    expect(s.menu('grind').some((i) => i.name === 'Green tea')).toBe(true);
    expect(s.menu('matcha').some((i) => i.name === 'Green tea')).toBe(false);
    expect(s.catalogue.getState().archiveItem('matcha', s.drink().id)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
  it('charges the selected size, preserves preparation options and snapshots bill/history', () => {
    const s = setup();
    const drink = s.drink();
    expect(
      s.catalogue.getState().saveItem('grind', {
        ...drink,
        sizes: [{ id: 'large', name: 'Large', price: 55000 }],
      }).ok,
    ).toBe(true);
    const item = s.menu('grind').find((i) => i.name === 'Cold brew · Large')!;
    s.cart.getState().addItem(item);
    expect(s.cart.getState().lines[0]?.modifiers).not.toBeNull();
    expect(s.cart.getState().submit(s.session()).ok).toBe(true);
    expect(calculateBill(s.session()).items).toBe(55000);
    expect(s.session().orders[0]).toMatchObject({
      menuItemId: item.id,
      name: 'Cold brew · Large',
      unitPrice: 55000,
    });
    s.catalogue.getState().saveItem('grind', {
      ...drink,
      sizes: [{ id: 'large', name: 'Large', price: 70000 }],
    });
    expect(calculateBill(s.session()).items).toBe(55000);
    expect(s.cart.getState().orders[0]?.total).toBe(55000);
  });
  it('sold-out changes reject stale carts and direct session additions without partial orders', () => {
    const s = setup();
    const menu = s.menu('grind');
    menu.forEach((item) => s.cart.getState().addItem(item));
    s.catalogue.getState().setSoldOut('grind', s.drink().id, true);
    expect(s.cart.getState().submit(s.session()).ok).toBe(false);
    expect(s.session().orders).toEqual([]);
    expect(s.core.getState().addItem(s.session().id, 'grind-drink').ok).toBe(
      false,
    );
    expect(s.menu('grind').some((i) => i.id === 'grind-drink')).toBe(false);
    expect(
      posCatalogueMenu(s.catalogue.getState(), s.venue).find(
        (i) => i.id === 'grind-drink',
      )?.soldOut,
    ).toBe(true);
    s.catalogue.getState().setSoldOut('grind', s.drink().id, false);
    expect(s.cart.getState().submit(s.session()).ok).toBe(true);
  });
  it('requires review of changed prices and refuses archived/replaced sizes', () => {
    const s = setup();
    const original = s.menu('grind')[0]!;
    s.cart.getState().addItem(original);
    s.catalogue.getState().saveItem('grind', { ...s.drink(), price: 50000 });
    expect(s.cart.getState().submit(s.session()).ok).toBe(false);
    expect(s.cart.getState().errorMessage?.key).toBe('pricesChanged');
    expect(s.cart.getState().lines[0]?.unitPrice).toBe(50000);
    expect(s.session().orders).toEqual([]);
    expect(s.cart.getState().submit(s.session()).ok).toBe(true);
    expect(calculateBill(s.session()).items).toBe(50000);
    s.catalogue.getState().archiveItem('grind', s.drink().id);
    expect(s.cart.getState().reorder(s.session()).ok).toBe(false);
    s.cart.getState().addItem(original);
    expect(s.cart.getState().lines).toEqual([]);
  });
  it('removing a size invalidates its old cart identity', () => {
    const s = setup();
    const item = s.drink();
    s.catalogue.getState().saveItem('grind', {
      ...item,
      sizes: [{ id: 'a', name: 'Small', price: 10000 }],
    });
    s.cart.getState().addItem(s.menu('grind')[0]!);
    s.catalogue.getState().saveItem('grind', {
      ...item,
      sizes: [{ id: 'b', name: 'Large', price: 20000 }],
    });
    expect(s.cart.getState().submit(s.session()).ok).toBe(false);
    expect(s.session().orders).toEqual([]);
  });
  it('persists only validated catalogue data and preserves stable IDs across restore', () => {
    const s = setup();
    for (let n = 0; n < 7; n++)
      s.catalogue
        .getState()
        .saveItem('grind', { ...s.drink(), id: undefined, name: `Tea ${n}` });
    const before = s.menu('grind');
    const snapshot = catalogueSnapshot(s.catalogue.getState());
    expect(JSON.stringify(snapshot)).not.toMatch(/password|token|secret/i);
    const next = createCatalogueStore();
    expect(next.getState().restore(snapshot)).toBe(true);
    expect(catalogueMenu(next.getState(), s.venue)).toEqual(before);
    expect(
      next
        .getState()
        .saveItem('grind', { ...s.drink(), id: undefined, name: 'Next' }).ok,
    ).toBe(true);
    expect(new Set(next.getState().items.map((i) => i.id)).size).toBe(
      next.getState().items.length,
    );
    expect(
      next.getState().restore({
        ...snapshot,
        items: [...snapshot.items, snapshot.items[0]],
      }),
    ).toBe(false);
    expect(
      catalogueMenu(next.getState(), s.venue).some((i) => i.name === 'Next'),
    ).toBe(true);
  });
  it.each(['', '-1', '1.5', 'Infinity', '1e4', '9007199254740992'])(
    'rejects invalid form price %j without modifying catalogue',
    (value) => {
      const s = setup();
      const before = catalogueSnapshot(s.catalogue.getState());
      const form = { ...itemForm(s.drink()), price: value };
      expect(s.catalogue.getState().saveItem('grind', formInput(form)).ok).toBe(
        false,
      );
      expect(catalogueSnapshot(s.catalogue.getState())).toEqual(before);
    },
  );
  it('supports custom venues and isolated category/item references after restore', () => {
    const s = setup();
    const custom: Venue = {
      ...s.venue,
      id: 'custom',
      name: 'Custom',
      seats: s.venue.seats.map((seat) => ({
        ...seat,
        venueId: 'custom',
        id: `custom-${seat.id}`,
      })),
      menu: [{ id: 'custom-drink', name: 'Custom coffee', price: 10000 }],
    };
    s.catalogue.getState().ensureVenues([custom]);
    expect(catalogueMenu(s.catalogue.getState(), custom)[0]?.name).toBe(
      'Custom coffee',
    );
    const restored = createCatalogueStore([
      s.venue,
      getVenue('matcha'),
      getVenue('cyber'),
      custom,
    ]);
    expect(
      restored.getState().restore(catalogueSnapshot(s.catalogue.getState())),
    ).toBe(true);
    const bad = catalogueSnapshot(s.catalogue.getState());
    bad.items[0]!.categoryId = bad.categories.find(
      (c) => c.tenantId === 'matcha',
    )!.id;
    expect(restored.getState().restore(bad)).toBe(false);
  });
  it('POS stays isolated while revalidating availability/prices through its adapter', () => {
    const s = setup();
    const pos = createPosStore({
      getMenu: (id) => posCatalogueMenu(s.catalogue.getState(), getVenue(id)),
      toggleSoldOut: () => {},
    });
    const order = pos.getState().createOrder('grind', null);
    expect(pos.getState().addLine(order, 'grind-drink', 'Forged', 1).ok).toBe(
      true,
    );
    expect(pos.getState().orders[0]?.lines[0]?.unitPrice).toBe(45000);
    s.catalogue.getState().setSoldOut('grind', s.drink().id, true);
    expect(pos.getState().pay(order, 'cash').ok).toBe(false);
    expect(pos.getState().setLineQuantity(order, 'grind-drink', 2).ok).toBe(
      false,
    );
    s.catalogue.getState().setSoldOut('grind', s.drink().id, false);
    s.catalogue.getState().saveItem('grind', { ...s.drink(), price: 50000 });
    expect(pos.getState().pay(order, 'cash').ok).toBe(false);
    expect(s.session().orders).toEqual([]);
  });
});
