import { Text } from 'react-native';
import { Card, Heading, colors, styles } from '@/components/ui';
import { getVenueInfo } from './venueInfo';

export function VenueInfoCard({ venueId }: { venueId: string }) {
  const info = getVenueInfo(venueId);
  return (
    <Card>
      <Heading>Wi-Fi and house rules</Heading>
      <Text style={styles.text}>
        Wi-Fi network:{' '}
        <Text style={{ color: colors.ink, fontWeight: '700' }}>
          {info.wifiName}
        </Text>
      </Text>
      <Text style={styles.text}>Password: {info.wifiAccess}</Text>
      {info.rules.map((rule, index) => (
        <Text key={rule} style={styles.text}>
          {index + 1}. {rule}
        </Text>
      ))}
    </Card>
  );
}
