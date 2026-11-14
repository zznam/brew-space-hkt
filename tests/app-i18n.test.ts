import { describe, expect, it } from 'vitest';
import { seatMapMessages, shellMessages } from '../src/components/messages';
import { galleryMessages } from '../src/features/gallery/messages';
import {
  merchantMessages,
  posErrorText,
  ticketText,
} from '../src/features/merchant/messages';
import { onboardingMessages } from '../src/features/merchant/onboarding/messages';
import type { Messages } from '../src/i18n/i18n';
import { seatLabelText } from '../src/i18n/seatLabel';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

const tables: Record<string, Messages<string>> = {
  shell: shellMessages,
  seatMap: seatMapMessages,
  merchant: merchantMessages,
  onboarding: onboardingMessages,
  gallery: galleryMessages,
};

describe('app-wide EN/VI copy', () => {
  it.each(Object.entries(tables))(
    '%s keeps the same placeholders in both languages',
    (_name, table) => {
      for (const key of Object.keys(table.en)) {
        expect(table.vi[key], key).toBeTruthy();
        expect(placeholders(table.vi[key] ?? ''), key).toEqual(
          placeholders(table.en[key] ?? ''),
        );
      }
    },
  );

  it('gives every gallery step a title, summary, action and highlight', () => {
    const steps = Object.keys(galleryMessages.en)
      .filter((key) => key.endsWith('.title'))
      .map((key) => key.replace('.title', ''));
    expect(steps).toHaveLength(11);
    for (const step of steps)
      for (const part of ['summary', 'cta', 'h1', 'h2'])
        expect(galleryMessages.en, step).toHaveProperty([`${step}.${part}`]);
  });

  it('renders seat and ticket labels per language', () => {
    expect(seatLabelText('Seat 8', 'en')).toBe('Seat 8');
    expect(seatLabelText('Seat 8', 'vi')).toBe('Chỗ 8');
    expect(seatLabelText('Focus Pod 9', 'vi')).toBe('Focus Pod 9');
    expect(ticketText('Walk-in #3', 'en')).toBe('Walk-in #3');
    expect(ticketText('Walk-in #3', 'vi')).toBe('Khách lẻ #3');
    expect(ticketText('Seat 2', 'vi')).toBe('Chỗ 2');
  });

  it('translates POS store errors and passes unknown ones through', () => {
    expect(posErrorText('Item is sold out.', 'vi')).toBe(
      'Món này đã hết hàng.',
    );
    expect(posErrorText('Item is sold out.', 'en')).toBe('Item is sold out.');
    expect(posErrorText('Something new.', 'vi')).toBe('Something new.');
  });
});
