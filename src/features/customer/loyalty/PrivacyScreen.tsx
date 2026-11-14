import { router } from 'expo-router';
import { Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  Eyebrow,
  Heading,
  styles,
  useResponsive,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { CustomerNav } from '../shared/CustomerNav';
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
    <Card>
      <CustomerNav current="member" />

      <View style={styles.rowBetween}>
        <View style={{ gap: 4 }}>
          <Eyebrow>CUSTOMER / DATA PRIVACY & TRANSPARENCY</Eyebrow>
          <Heading>{t('privTitle')}</Heading>
        </View>
        <Badge label="Local Device Only" tone="success" />
      </View>

      <Text style={styles.text}>{t('privIntro')}</Text>

      <Divider />

      <View style={{ gap: 12 }}>
        {SECTIONS.map((section) => (
          <Card key={section.title} variant="subtle" style={{ gap: 6 }}>
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

      <Card
        variant="subtle"
        style={{
          gap: 8,
          backgroundColor: colors.surface,
          borderColor: colors.borderStrong,
        }}
      >
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
    </Card>
  );
}
