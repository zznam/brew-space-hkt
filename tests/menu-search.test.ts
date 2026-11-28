import { describe, expect, it } from 'vitest';
import {
  foldText,
  visibleMenuItems,
} from '../src/features/purchase/menuSearch';

const items = [
  { id: '1', name: 'Cà phê sữa đá', categoryId: 'coffee' },
  { id: '2', name: 'Cold brew', categoryId: 'coffee' },
  { id: '3', name: 'Bánh mì trứng', categoryId: 'food' },
  { id: '4', name: 'Trà đào cam sả', categoryId: 'tea' },
];
const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe('F116 menu search', () => {
  it('keeps the category filter when there is no query', () => {
    expect(ids(visibleMenuItems(items, 'coffee', ''))).toEqual(['1', '2']);
    expect(ids(visibleMenuItems(items, null, '   '))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('searches every category, ignoring case and Vietnamese accents', () => {
    expect(ids(visibleMenuItems(items, 'food', 'ca phe'))).toEqual(['1']);
    expect(ids(visibleMenuItems(items, 'coffee', 'DAO'))).toEqual(['4']);
    expect(ids(visibleMenuItems(items, null, 'da'))).toEqual(['1', '4']);
  });

  it('requires every word and returns nothing for no match', () => {
    expect(ids(visibleMenuItems(items, null, 'banh trung'))).toEqual(['3']);
    expect(visibleMenuItems(items, null, 'pizza')).toEqual([]);
  });

  it('folds đ and accents', () => {
    expect(foldText('  Trà Đào ')).toBe('tra dao');
  });
});
