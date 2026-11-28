import {
  contrastRatio,
  HEX_COLOUR,
  MIN_BRAND_CONTRAST,
} from '@/core/pilot/access';

export type BrandColours = {
  primary: string;
  background: string;
  text: string;
};

export type BrandCheck =
  | { kind: 'invalid'; fields: (keyof BrandColours)[] }
  | { kind: 'low'; ratio: number }
  | { kind: 'ok'; ratio: number };

/** F265: the same colour and contrast rules the server applies, checked before saving. */
export function checkBrandColours(colours: BrandColours): BrandCheck {
  const fields = (['primary', 'background', 'text'] as const).filter(
    (key) => !HEX_COLOUR.test(colours[key].trim()),
  );
  if (fields.length) return { kind: 'invalid', fields };
  const ratio = contrastRatio(colours.text.trim(), colours.background.trim());
  return ratio < MIN_BRAND_CONTRAST
    ? { kind: 'low', ratio }
    : { kind: 'ok', ratio };
}

/** "4.6:1", rounded down so a value just under the minimum never displays as passing. */
export function formatRatio(ratio: number): string {
  return `${Math.floor(ratio * 10) / 10}:1`;
}
