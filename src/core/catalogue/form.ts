import type { ItemInput } from '../pilot/catalogue';
import type { Item } from '../pilot/types';
export interface ItemForm {
  id?: string;
  name: string;
  price: string;
  categoryId: string;
  kind: Item['kind'];
  limited: boolean;
  sizes: { id: string; name: string; price: string }[];
  modifierGroups: Item['modifierGroups'];
}
export function itemForm(item?: Item, categoryId = ''): ItemForm {
  return {
    ...(item ? { id: item.id } : {}),
    name: item?.name ?? '',
    price: item ? String(item.price) : '',
    categoryId: item?.categoryId ?? categoryId,
    kind: item?.kind ?? 'food_drink',
    limited: item?.limited ?? false,
    sizes: item?.sizes.map((s) => ({ ...s, price: String(s.price) })) ?? [],
    modifierGroups: item?.modifierGroups ?? [],
  };
}
const price = (value: string): number =>
  /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
/** Invalid/blank/decimal input reaches the engine as invalid money, never zero. */
export function formInput(form: ItemForm): ItemInput {
  return {
    ...form,
    price: price(form.price),
    sizes: form.sizes.map((s) => ({ ...s, price: price(s.price) })),
  };
}
export function nextSizeId(sizes: ItemForm['sizes']): string {
  let n = 1;
  while (sizes.some((s) => s.id === `size-${n}`)) n++;
  return `size-${n}`;
}
