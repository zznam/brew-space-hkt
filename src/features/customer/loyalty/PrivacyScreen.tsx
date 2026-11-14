import { router } from 'expo-router';
import { Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { loyaltyMessages } from './messages';

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
  const { isWide } = useResponsive();
  return (
    <Screen>
      <ScreenHeader
        overline="CUSTOMER / DATA PRIVACY"
        title={t('privTitle')}
        subtitle={t('privIntro')}
      />
      <Badge label="Local Device Only" tone="success" />

      <View style={{ gap: space.md }}>
        {SECTIONS.map((section) => (
          <Card key={section.title} variant="subtle">
            <Text accessibilityRole="header" style={styles.subheading}>
              {t(section.title)}
            </Text>
            {section.lines.map((line) => (
              <Text key={line} style={styles.text}>
                {t(line)}
              </Text>
            ))}
          </Card>
        ))}
      </View>

      <Card>
        <Text accessibilityRole="header" style={styles.subheading}>
          {t('privDeleteTitle')}
        </Text>
        <Text style={styles.text}>{t('privDeleteBody')}</Text>
        <View style={styles.row}>
          <Button
            variant="primary"
            fullWidth={!isWide}
            label={t('privGoMember')}
            onPress={() => router.replace('/customer/profile' as never)}
          />
        </View>
      </Card>
    </Screen>
  );
}
