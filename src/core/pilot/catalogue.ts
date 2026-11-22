import {
  activeTenant,
  audit,
  branchById,
  owned,
  requireStaff,
  staffActor,
} from './access';
import { fail } from './errors';
import { calculateLineTotal } from '../billing';
import type { Item, OrderLine, Tx } from './types';
import { isMoney, isText, nextId } from './util';
import { publicSales } from './promotions';

export function saveCategory(
  tx: Tx,
  input: { id?: string; name: string; sort: number },
) {
  const staff = requireStaff(tx, 'menu.edit');
  if (
    !isText(input.name, 60) ||
    !Number.isSafeInteger(input.sort) ||
    input.sort < 0
  )
    fail('VALIDATION', 'Enter a category name and a nonnegative sort order.');
  const row = input.id
    ? owned(tx.db.categories, input.id, staff.tenantId)
    : { id: nextId(tx.db, 'cat'), tenantId: staff.tenantId, name: '', sort: 0 };
  row.name = input.name.trim();
  row.sort = input.sort;
  if (!input.id) tx.db.categories.push(row);
  audit(tx, staffActor(staff), 'category.save', row.id, {
    tenantId: staff.tenantId,
  });
  return row;
}

export type ItemInput = Omit<
  Item,
  'id' | 'tenantId' | 'archived' | 'soldOut'
> & { id?: string };
export function saveItem(tx: Tx, input: ItemInput) {
  const staff = requireStaff(tx, 'menu.edit');
  owned(tx.db.categories, input.categoryId, staff.tenantId);
  if (
    !isText(input.name, 80) ||
    !['food_drink', 'service'].includes(input.kind) ||
    !isMoney(input.price) ||
    typeof input.limited !== 'boolean' ||
    !Array.isArray(input.sizes) ||
    !Array.isArray(input.modifierGroups)
  )
    fail('VALIDATION', 'Enter a name, valid price and item options.');
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (
    !input.sizes.every(
      (s) => s && isText(s.id, 40) && isText(s.name, 40) && isMoney(s.price),
    ) ||
    !unique(input.sizes.map((s) => s.id))
  )
    fail('VALIDATION', 'Sizes need unique IDs, names and valid prices.');
  if (
    !input.modifierGroups.every(
      (g) =>
        g &&
        isText(g.id, 40) &&
        isText(g.name, 40) &&
        Array.isArray(g.options) &&
        g.options.length > 0 &&
        g.options.every(
          (o) =>
            o &&
            isText(o.id, 40) &&
            isText(o.name, 40) &&
            isMoney(o.priceDelta),
        ) &&
        unique(g.options.map((o) => o.id)),
    ) ||
    !unique(input.modifierGroups.map((g) => g.id))
  )
    fail(
      'VALIDATION',
      'Modifier groups need unique options with valid prices.',
    );
  const row: Item = input.id
    ? owned(tx.db.items, input.id, staff.tenantId)
    : {
        id: nextId(tx.db, 'itm'),
        tenantId: staff.tenantId,
        archived: false,
        soldOut: false,
        categoryId: input.categoryId,
        kind: input.kind,
        name: input.name,
        price: input.price,
        limited: input.limited,
        sizes: [],
        modifierGroups: [],
      };
  // Allowlist fields: callers cannot supply tenant, archival or sold-out state.
  Object.assign(row, {
    categoryId: input.categoryId,
    kind: input.kind,
    name: input.name.trim(),
    price: input.price,
    limited: input.limited,
    sizes: input.sizes.map((s) => ({
      id: s.id,
      name: s.name.trim(),
      price: s.price,
    })),
    modifierGroups: input.modifierGroups.map((g) => ({
      id: g.id,
      name: g.name.trim(),
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name.trim(),
        priceDelta: o.priceDelta,
      })),
    })),
  });
  if (!input.id) tx.db.items.push(row);
  audit(tx, staffActor(staff), 'item.save', row.id, {
    tenantId: staff.tenantId,
  });
  return row;
}
export function archiveItem(tx: Tx, input: { itemId: string }) {
  const staff = requireStaff(tx, 'menu.edit');
  const row = owned(tx.db.items, input.itemId, staff.tenantId);
  row.archived = true;
  audit(tx, staffActor(staff), 'item.archive', row.id, {
    tenantId: staff.tenantId,
  });
  return row;
}
export function setSoldOut(
  tx: Tx,
  input: { itemId: string; soldOut: boolean },
) {
  const staff = requireStaff(tx, 'item.soldout');
  const row = owned(tx.db.items, input.itemId, staff.tenantId);
  if (typeof input.soldOut !== 'boolean') fail('VALIDATION');
  row.soldOut = input.soldOut;
  audit(tx, staffActor(staff), 'item.soldout', row.id, {
    tenantId: staff.tenantId,
    meta: { soldOut: row.soldOut },
  });
  return row;
}
export function getCatalogue(tx: Tx) {
  const staff = requireStaff(tx, 'floor.read');
  return {
    categories: tx.db.categories
      .filter((c) => c.tenantId === staff.tenantId)
      .sort((a, b) => a.sort - b.sort),
    items: tx.db.items.filter((i) => i.tenantId === staff.tenantId),
  };
}
export function publicVenue(tx: Tx, input: { slug: string }) {
  const branch = tx.db.branches.find((b) => b.slug === input.slug);
  if (!branch) fail('NOT_FOUND');
  const tenant = activeTenant(tx.db, branch.tenantId);
  return {
    branch: {
      id: branch.id,
      tenantId: tenant.id,
      name: branch.name,
      timezone: branch.timezone,
      hours: branch.hours,
      address: branch.address,
    },
    brand: tenant.brand,
    currency: tenant.currency,
    sales: publicSales(tx, branch.id),
    categories: tx.db.categories
      .filter((c) => c.tenantId === tenant.id)
      .sort((a, b) => a.sort - b.sort),
    items: tx.db.items.filter(
      (i) => i.tenantId === tenant.id && !i.archived && !i.soldOut,
    ),
  };
}
/** A line preview, not an order or payment. Prices/options are read again on each call. */
export function snapshotItem(
  tx: Tx,
  input: {
    branchId: string;
    itemId: string;
    sizeId?: string;
    quantity: number;
    modifiers?: { groupId: string; optionId: string }[];
    note?: string;
  },
): OrderLine {
  const branch = branchById(tx.db, input.branchId);
  activeTenant(tx.db, branch.tenantId);
  const item = owned(tx.db.items, input.itemId, branch.tenantId);
  if (item.archived || item.soldOut) fail('ITEM_UNAVAILABLE');
  if (
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 99 ||
    (input.note !== undefined &&
      (typeof input.note !== 'string' || input.note.length > 200))
  )
    fail('VALIDATION');
  const size = item.sizes.find((s) => s.id === input.sizeId);
  if ((item.sizes.length > 0 && !size) || (input.sizeId !== undefined && !size))
    fail('VALIDATION', 'Choose an available size.');
  const seen = new Set<string>();
  if (input.modifiers !== undefined && !Array.isArray(input.modifiers))
    fail('VALIDATION');
  const modifiers = (input.modifiers ?? []).map((m) => {
    if (!m || seen.has(m.groupId))
      fail('VALIDATION', 'Choose one option per group.');
    seen.add(m.groupId);
    const group = item.modifierGroups.find((g) => g.id === m.groupId);
    const option = group?.options.find((o) => o.id === m.optionId);
    if (!option) fail('VALIDATION', 'Choose an available modifier.');
    return {
      groupId: m.groupId,
      optionId: option.id,
      name: option.name,
      priceDelta: option.priceDelta,
    };
  });
  const base = size?.price ?? item.price;
  const unitPrice = calculateLineTotal(
    base,
    modifiers.map((m) => m.priceDelta),
    1,
  );
  return {
    id: nextId(tx.db, 'line'),
    kind: 'item',
    itemId: item.id,
    categoryId: item.categoryId,
    name: item.name,
    quantity: input.quantity,
    unitPrice,
    lineTotal: calculateLineTotal(
      base,
      modifiers.map((m) => m.priceDelta),
      input.quantity,
    ),
    ...(size ? { sizeId: size.id, sizeName: size.name } : {}),
    modifiers,
    note: input.note?.trim() ?? '',
    limited: item.limited,
  };
}
