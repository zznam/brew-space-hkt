import { createStore } from 'zustand/vanilla';
import { DEFAULT_LANG, isLang, type Lang } from './i18n';

export interface LanguageStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

/** Factory so tests get a fresh store; persistence lives in useLanguage.ts. */
export function createLanguageStore(initial: Lang = DEFAULT_LANG) {
  return createStore<LanguageStore>()((set) => ({
    lang: initial,
    setLang: (lang) => {
      if (isLang(lang)) set({ lang });
    },
  }));
}
