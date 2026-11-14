import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Heading, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { CustomerNav } from '../shared/CustomerNav';
import { loyaltyMessages } from './messages';

const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

type Key = keyof typeof loyaltyMessages.en;
const SECTIONS: { title: Key; lines: Key[] }[] = [
  { title: 'privS1Title', lines: ['privS1L1'] },
  { title: 'privS2Title', lines: ['privS2L1', 'privS2L2'] },
  { title: 'privS3Title', lines: ['privS3L1', 'privS3L2', 'privS3L3'] },
  { title: 'privS4Title', lines: ['privS4L1'] },
  { title: 'privS5Title', lines: ['privS5L1'] },
  { title: 'privS6Title', lines: ['privS6L1'] },
];

export function PrivacyScreen() {
  const { t } = useT(loyaltyMessages);
  return (
    <Card>
      <CustomerNav current="member" />
      <Heading>{t('privTitle')}</Heading>
      <Text style={styles.text}>{t('privIntro')}</Text>
      {SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={sectionTitle}>
            {t(section.title)}
          </Text>
          {section.lines.map((line) => (
            <Text key={line} style={styles.text}>
              {t(line)}
            </Text>
          ))}
        </View>
      ))}
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={sectionTitle}>
          {t('privDeleteTitle')}
        </Text>
        <Text style={styles.text}>{t('privDeleteBody')}</Text>
        <View style={styles.row}>
          <Button
            label={t('privGoMember')}
            onPress={() => router.replace('/customer/profile' as never)}
          />
        </View>
      </View>
    </Card>
  );
}
