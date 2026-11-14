import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { isLang, translator, type Messages, type Translate } from './i18n';
import { createLanguageStore, type LanguageStore } from './languageStore';

const STORAGE_KEY = 'vibing-hkt:customer-lang:v1';
export const languageStore = createLanguageStore();
let initialization: Promise<void> | undefined;

/** Restores the saved language once, then saves every change. English shows
 * until restore finishes; a failed read or write keeps the current language. */
export function initializeLanguage(): Promise<void> {
  return (initialization ??= (async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) languageStore.getState().setLang(saved);
    } catch {
      // Keep the default language.
    }
    languageStore.subscribe((state) => {
      AsyncStorage.setItem(STORAGE_KEY, state.lang).catch(() => {
        console.warn('Language choice could not be saved on this device.');
      });
    });
  })());
}

export const useLanguageStore = <T>(selector: (state: LanguageStore) => T) =>
  useStore(languageStore, selector);

/** Current language plus a translator for one slice's message table. */
export function useT<K extends string>(
  messages: Messages<K>,
): { t: Translate<K>; lang: LanguageStore['lang'] } {
  const lang = useLanguageStore((state) => state.lang);
  useEffect(() => {
    void initializeLanguage();
  }, []);
  const t = useMemo(() => translator(messages, lang), [messages, lang]);
  return { t, lang };
}
