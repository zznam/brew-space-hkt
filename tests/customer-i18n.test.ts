import { describe, expect, it } from 'vitest';
import {
  defineMessages,
  interpolate,
  isLang,
  translate,
  translator,
} from '../src/i18n/i18n';
import { createLanguageStore } from '../src/i18n/languageStore';

const messages = defineMessages(
  { hello: 'Hello {name}', seats: '{free} of {total} seats free' },
  { hello: 'Xin chào {name}', seats: 'Còn {free}/{total} chỗ trống' },
);

describe('customer i18n', () => {
  it('translates with parameters in both languages', () => {
    expect(translate(messages, 'en', 'hello', { name: 'An' })).toBe('Hello An');
    expect(translator(messages, 'vi')('seats', { free: 3, total: 8 })).toBe(
      'Còn 3/8 chỗ trống',
    );
  });
  it('leaves unknown placeholders visible', () => {
    expect(interpolate('Hi {name} {missing}', { name: 'An' })).toBe(
      'Hi An {missing}',
    );
    expect(interpolate('No params')).toBe('No params');
  });
  it('validates language codes', () => {
    expect(isLang('vi')).toBe(true);
    expect(isLang('fr')).toBe(false);
    expect(isLang(null)).toBe(false);
  });
  it('store defaults to English and ignores unknown languages', () => {
    const store = createLanguageStore();
    expect(store.getState().lang).toBe('en');
    store.getState().setLang('vi');
    expect(store.getState().lang).toBe('vi');
    store.getState().setLang('fr' as never);
    expect(store.getState().lang).toBe('vi');
  });
});
