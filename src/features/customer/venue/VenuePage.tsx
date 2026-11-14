import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney, type Venue } from '@/core';
import { Card, Heading, colors, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { kindName, venueMessages } from './messages';
import { venuePageInfo } from './venueModel';

/** F131: hours, address and seat price table, shown before a seat is chosen.
 * All details are demo data; prices come from the core billing function. */
export function VenuePage({ venue }: { venue: Venue }) {
  // Read once per mount: "open now" is the device clock in venue time.
  const [now] = useState(() => new Date());
  const { t, lang } = useT(venueMessages);
  const info = venuePageInfo(venue, now, lang);
  return (
    <Card>
      <Heading>{t('venueHeading')}</Heading>
      <Text style={styles.text}>{t('address', { address: info.address })}</Text>
      {info.openNow === null ? null : (
        <Text
          style={{
            color: info.openNow ? colors.green : colors.muted,
            fontWeight: '700',
          }}
        >
          {info.openNow ? t('openNow') : t('closedNow')}{' '}
          <Text style={{ fontWeight: '400' }}>{t('clockNote')}</Text>
        </Text>
      )}
      <View style={{ gap: 2 }}>
        <Text style={{ fontWeight: '700' }}>{t('openingHours')}</Text>
        {info.hours.map((line) => (
          <Text key={line.days} style={styles.text}>
            {line.days}: {line.text}
          </Text>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '700' }}>{t('pricesTitle')}</Text>
        {info.prices.map((row) => (
          <Text key={row.kind} style={styles.text}>
            {t('priceRow', {
              kind: kindName(row.kind, lang),
              count: row.seatCount,
              from: row.varies ? t('priceFrom') : '',
              rate: formatMoney(row.hourlyRate),
              b2: formatMoney(row.bundle2h),
              b4: formatMoney(row.bundle4h),
            })}
          </Text>
        ))}
      </View>
      <Text style={styles.text}>{t('venueDemoNote')}</Text>
    </Card>
  );
}
