/** App translations. Pure: no React or storage, so models and tests
 * can import it. Each feature slice owns its own message table built with
 * `defineMessages`, so slices never edit a shared dictionary. Money keeps the
 * vi-VN format from core `formatMoney` in both languages. */
export const LANGUAGES = ['en', 'vi'] as const;
export type Lang = (typeof LANGUAGES)[number];
export const DEFAULT_LANG: Lang = 'en';
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

export const isLang = (value: unknown): value is Lang =>
  value === 'en' || value === 'vi';

export type Params = Record<string, string | number>;

/** English is the source; the compiler forces Vietnamese to have every key. */
export interface Messages<K extends string> {
  en: Record<K, string>;
  vi: Record<K, string>;
}
export function defineMessages<K extends string>(
  en: Record<K, string>,
  vi: Record<K, string>,
): Messages<K> {
  return { en, vi };
}

/** Replaces `{name}` placeholders; unknown placeholders are left visible so a
 * missing parameter is noticed rather than silently dropped. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function translate<K extends string>(
  messages: Messages<K>,
  lang: Lang,
  key: K,
  params?: Params,
): string {
  return interpolate(messages[lang][key] ?? messages.en[key], params);
}

export type Translate<K extends string> = (key: K, params?: Params) => string;
export const translator =
  <K extends string>(messages: Messages<K>, lang: Lang): Translate<K> =>
  (key, params) =>
    translate(messages, lang, key, params);
