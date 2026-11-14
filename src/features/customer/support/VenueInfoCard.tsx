import { Text, View } from 'react-native';
import { Badge, Card, Heading, styles, space } from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { supportMessages } from './messages';
import { getVenueInfo } from './venueInfo';

export function VenueInfoCard({ venueId }: { venueId: string }) {
  const { t, lang } = useT(supportMessages);
  const info = getVenueInfo(venueId, lang);
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading level={2}>{t('venueHeading')}</Heading>
        <Badge label={t('wifiReady')} tone="success" />
      </View>

      <View style={styles.inset}>
        <Text style={styles.text}>
          {t('wifiNetwork')}{' '}
          <Text style={styles.textStrong}>{info.wifiName}</Text>
        </Text>
        <Text style={styles.text}>
          {t('wifiPassword', { where: info.wifiAccess })}
        </Text>
      </View>

      <View style={{ gap: space.xs }}>
        {info.rules.map((rule, index) => (
          <Text key={rule} style={styles.text}>
            {index + 1}. {rule}
          </Text>
        ))}
      </View>
    </Card>
  );
}
