import { Text, View } from 'react-native';
import { Button, styles } from '@/components/ui';
import { defineMessages, LANGUAGE_NAMES, LANGUAGES } from './i18n';
import { languageStore, useT } from './useLanguage';

const messages = defineMessages(
  { language: 'Language' },
  { language: 'Ngôn ngữ' },
);

/** Language names are always written in their own language so either reader
 * can find theirs. */
export function LanguageToggle() {
  const { t, lang } = useT(messages);
  return (
    <View style={styles.row}>
      <Text style={styles.text}>{t('language')}:</Text>
      {LANGUAGES.map((code) => (
        <Button
          key={code}
          label={LANGUAGE_NAMES[code]}
          selected={code === lang}
          onPress={() => languageStore.getState().setLang(code)}
        />
      ))}
    </View>
  );
}
