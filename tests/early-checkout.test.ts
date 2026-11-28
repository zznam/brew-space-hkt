import { describe, expect, it } from 'vitest';
import { includedMinutes, unusedPrepaidMinutes } from '../src/core';

describe('F248 early checkout', () => {
  it('knows the prepaid minutes in each billing mode', () => {
    expect(includedMinutes('METERED_OPEN')).toBe(0);
    expect(includedMinutes('BUNDLE_2H')).toBe(120);
    expect(includedMinutes('BUNDLE_4H')).toBe(240);
  });

  it('reports unused prepaid time only while a bundle is not used up', () => {
    expect(
      unusedPrepaidMinutes({ mode: 'BUNDLE_2H', elapsedMinutes: 45 }),
    ).toBe(75);
    expect(unusedPrepaidMinutes({ mode: 'BUNDLE_4H', elapsedMinutes: 0 })).toBe(
      240,
    );
    expect(
      unusedPrepaidMinutes({ mode: 'BUNDLE_2H', elapsedMinutes: 120 }),
    ).toBe(0);
    expect(
      unusedPrepaidMinutes({ mode: 'BUNDLE_2H', elapsedMinutes: 200 }),
    ).toBe(0);
    expect(
      unusedPrepaidMinutes({ mode: 'METERED_OPEN', elapsedMinutes: 5 }),
    ).toBe(0);
  });
});
