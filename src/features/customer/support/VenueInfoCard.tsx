import { Text } from 'react-native';
import { Card, Heading, colors, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages } from './messages';
import { getVenueInfo } from './venueInfo';

export function VenueInfoCard({ venueId }: { venueId: string }) {
  const { t, lang } = useT(supportMessages);
  const info = getVenueInfo(venueId, lang);
  return (
    <Card>
      <Heading>{t('venueHeading')}</Heading>
      <Text style={styles.text}>
        {t('wifiNetwork')}{' '}
        <Text style={{ color: colors.ink, fontWeight: '700' }}>
          {info.wifiName}
        </Text>
      </Text>
      <Text style={styles.text}>
        {t('wifiPassword', { where: info.wifiAccess })}
      </Text>
      {info.rules.map((rule, index) => (
        <Text key={rule} style={styles.text}>
          {index + 1}. {rule}
        </Text>
      ))}
    </Card>
  );
}
