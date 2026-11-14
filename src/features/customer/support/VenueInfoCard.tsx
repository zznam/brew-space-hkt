import { Text, View } from 'react-native';
import { Badge, Card, colors, Heading, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages } from './messages';
import { getVenueInfo } from './venueInfo';

export function VenueInfoCard({ venueId }: { venueId: string }) {
  const { t, lang } = useT(supportMessages);
  const info = getVenueInfo(venueId, lang);
  return (
    <Card variant="subtle" style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <Heading style={{ fontSize: 20 }}>{t('venueHeading')}</Heading>
        <Badge label="Wi-Fi Ready" tone="success" />
      </View>

      <View
        style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 4,
        }}
      >
        <Text style={styles.text}>
          {t('wifiNetwork')}{' '}
          <Text style={{ color: colors.ink, fontWeight: '700' }}>
            {info.wifiName}
          </Text>
        </Text>
        <Text style={styles.text}>
          {t('wifiPassword', { where: info.wifiAccess })}
        </Text>
      </View>

      <View style={{ gap: 4 }}>
        {info.rules.map((rule, index) => (
          <Text key={rule} style={styles.text}>
            {index + 1}. {rule}
          </Text>
        ))}
      </View>
    </Card>
  );
}
