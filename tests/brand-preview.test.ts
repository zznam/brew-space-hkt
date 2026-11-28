import { describe, expect, it } from 'vitest';
import { validateBrand } from '../src/core/pilot/access';
import {
  checkBrandColours,
  formatRatio,
} from '../src/features/access/brandPreview';

const brand = (colours: {
  primary: string;
  background: string;
  text: string;
}) => ({
  displayName: 'The Grind',
  logoUrl: null,
  ...colours,
});

describe('F265 brand preview and contrast check', () => {
  it('passes readable pairs and reports the ratio', () => {
    const check = checkBrandColours({
      primary: '#0a7b5c',
      background: '#ffffff',
      text: '#1b1b1b',
    });
    expect(check.kind).toBe('ok');
    expect(check.kind === 'ok' && check.ratio).toBeGreaterThan(15);
  });

  it('refuses low contrast, matching the server rule', () => {
    const colours = {
      primary: '#0a7b5c',
      background: '#ffffff',
      text: '#aaaaaa',
    };
    const check = checkBrandColours(colours);
    expect(check.kind).toBe('low');
    expect(() => validateBrand(brand(colours))).toThrow();
  });

  it('agrees with the server at the 4.5:1 boundary', () => {
    for (const text of ['#767676', '#777777']) {
      const colours = { primary: '#000000', background: '#ffffff', text };
      const accepted = (() => {
        try {
          validateBrand(brand(colours));
          return true;
        } catch {
          return false;
        }
      })();
      expect(checkBrandColours(colours).kind === 'ok').toBe(accepted);
    }
  });

  it('flags malformed colours by field', () => {
    expect(
      checkBrandColours({
        primary: 'teal',
        background: '#fff',
        text: '#000000',
      }),
    ).toEqual({
      kind: 'invalid',
      fields: ['primary', 'background'],
    });
  });

  it('rounds ratios down for display', () => {
    expect(formatRatio(4.49)).toBe('4.4:1');
    expect(formatRatio(21)).toBe('21:1');
  });
});
