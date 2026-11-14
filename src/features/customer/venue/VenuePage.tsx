import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney, type Venue } from '@/core';
import {
  Badge,
  Card,
  colors,
  Heading,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { kindName, venueMessages } from './messages';
import { venuePageInfo } from './venueModel';

/** F131: hours, address and seat price table, shown before a seat is chosen.
 * All details are demo data; prices come from the core billing function. */
export function VenuePage({ venue }: { venue: Venue }) {
  // Read once per mount: "open now" is the device clock in venue time.
  const [now] = useState(() => new Date());
  const { isWide } = useResponsive();
  const { t, lang } = useT(venueMessages);
  const info = venuePageInfo(venue, now, lang);
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading level={2}>{t('venueHeading')}</Heading>
        {info.openNow === null ? null : (
          <Badge
            label={info.openNow ? t('openNow') : t('closedNow')}
            tone={info.openNow ? 'success' : 'neutral'}
          />
        )}
      </View>

      <Text style={styles.textStrong}>
        {t('address', { address: info.address })}
      </Text>

      {info.openNow === null ? null : (
        <Text style={styles.caption}>{t('clockNote')}</Text>
      )}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: space.md,
        }}
      >
        <View style={{ flex: isWide ? 1 : undefined, gap: space.xs }}>
          <Text style={styles.sectionLabel}>{t('openingHours')}</Text>
          {info.hours.map((line) => (
            <Text key={line.days} style={styles.text}>
              {line.days}: {line.text}
            </Text>
          ))}
        </View>

        <View style={{ flex: isWide ? 1.2 : undefined, gap: space.sm }}>
          <Text style={styles.sectionLabel}>{t('pricesTitle')}</Text>
          {info.prices.map((row) => (
            <View key={row.kind} style={styles.inset}>
              <Text style={[styles.caption, { color: colors.ink }]}>
                {t('priceRow', {
                  kind: kindName(row.kind, lang),
                  count: row.seatCount,
                  from: row.varies ? t('priceFrom') : '',
                  rate: formatMoney(row.hourlyRate),
                  b2: formatMoney(row.bundle2h),
                  b4: formatMoney(row.bundle4h),
                })}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.caption}>{t('venueDemoNote')}</Text>
    </Card>
  );
}
