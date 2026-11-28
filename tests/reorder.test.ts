import { describe, expect, it } from 'vitest';
import { rebuildCart } from '../src/features/purchase/reorder';

const menu = [
  {
    id: 'latte',
    sizes: [{ id: 'large' }],
    modifierGroups: [{ id: 'milk', options: [{ id: 'oat' }] }],
  },
  { id: 'croissant', sizes: [], modifierGroups: [] },
];

describe('F120 reorder the last order', () => {
  it('rebuilds item lines with their size, modifiers and note', () => {
    const result = rebuildCart(
      [
        {
          kind: 'item',
          name: 'Latte · Large',
          quantity: 2,
          itemId: 'latte',
          sizeId: 'large',
          modifiers: [{ groupId: 'milk', optionId: 'oat' }],
          note: 'No ice',
        },
        { kind: 'item', name: 'Croissant', quantity: 1, itemId: 'croissant' },
        { kind: 'seat', name: 'Seat 3', quantity: 1 },
      ],
      menu,
    );
    expect(result).toEqual({
      lines: [
        {
          itemId: 'latte',
          quantity: 2,
          sizeId: 'large',
          modifiers: [{ groupId: 'milk', optionId: 'oat' }],
          note: 'No ice',
        },
        { itemId: 'croissant', quantity: 1 },
      ],
      skipped: [],
    });
  });

  it('skips sold-out items and removed sizes, naming them', () => {
    const result = rebuildCart(
      [
        { kind: 'item', name: 'Matcha', quantity: 1, itemId: 'matcha' },
        {
          kind: 'item',
          name: 'Latte · Small',
          quantity: 1,
          itemId: 'latte',
          sizeId: 'small',
        },
        { kind: 'item', name: 'Croissant', quantity: 1, itemId: 'croissant' },
      ],
      menu,
    );
    expect(result.lines).toEqual([{ itemId: 'croissant', quantity: 1 }]);
    expect(result.skipped).toEqual(['Matcha', 'Latte · Small']);
  });

  it('drops a removed modifier option but keeps the line', () => {
    const result = rebuildCart(
      [
        {
          kind: 'item',
          name: 'Latte',
          quantity: 1,
          itemId: 'latte',
          sizeId: 'large',
          modifiers: [{ groupId: 'milk', optionId: 'soy' }],
        },
      ],
      menu,
    );
    expect(result.lines).toEqual([
      { itemId: 'latte', quantity: 1, sizeId: 'large' },
    ]);
  });
});
