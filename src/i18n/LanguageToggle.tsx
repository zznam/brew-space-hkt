import { useEffect } from 'react';
import { SegmentedControl } from '@/components/ui';
import { LANGUAGE_NAMES, LANGUAGES } from './i18n';
import {
  initializeLanguage,
  languageStore,
  useLanguageStore,
} from './useLanguage';

/** Language names are always written in their own language so either reader
 * can find theirs. */
export function LanguageToggle() {
  const lang = useLanguageStore((state) => state.lang);
  useEffect(() => {
    void initializeLanguage();
  }, []);
  return (
    <SegmentedControl
      size="sm"
      value={lang}
      options={LANGUAGES.map((code) => ({
        value: code,
        label: LANGUAGE_NAMES[code],
      }))}
      onChange={(code) => languageStore.getState().setLang(code)}
    />
  );
}
