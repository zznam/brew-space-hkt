import { describe, expect, it } from 'vitest';
import {
  tenderState,
  tenderSuggestions,
} from '../src/features/purchase/cashTender';

describe('F215 cash tendered and change', () => {
  it('shows change for an amount at or above the total', () => {
    expect(tenderState(45000, '50000')).toEqual({
      kind: 'ok',
      tendered: 50000,
      change: 5000,
    });
    expect(tenderState(45000, ' 45000 ')).toEqual({
      kind: 'ok',
      tendered: 45000,
      change: 0,
    });
  });

  it('refuses an amount below the total and says how much is missing', () => {
    expect(tenderState(45000, '40000')).toEqual({ kind: 'short', short: 5000 });
    expect(tenderState(45000, '0')).toEqual({ kind: 'short', short: 45000 });
  });

  it('separates an empty field from malformed input', () => {
    expect(tenderState(45000, '')).toEqual({ kind: 'empty' });
    for (const text of ['-1', '4.5', '1e5', '50.000', 'abc', '9'.repeat(20)]) {
      expect(tenderState(45000, text)).toEqual({ kind: 'invalid' });
    }
  });

  it('suggests the exact total and the next round banknote amounts', () => {
    expect(tenderSuggestions(45000)).toEqual([45000, 50000, 60000, 100000]);
    expect(tenderSuggestions(50000)).toEqual([50000, 60000, 100000, 200000]);
    expect(tenderSuggestions(123000)).toEqual([123000, 130000, 140000, 150000]);
    expect(tenderSuggestions(0)).toEqual([]);
    expect(tenderSuggestions(1.5)).toEqual([]);
  });

  it('every suggestion is accepted with non-negative change', () => {
    for (const total of [1, 9999, 45000, 199000, 2_750_000]) {
      for (const amount of tenderSuggestions(total)) {
        const state = tenderState(total, String(amount));
        expect(state.kind).toBe('ok');
      }
    }
  });
});
