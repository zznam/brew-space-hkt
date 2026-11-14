import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney, type Venue } from '@/core';
import {
  Badge,
  Card,
  colors,
  Heading,
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
    <Card variant="subtle" style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <Heading style={{ fontSize: 18 }}>{t('venueHeading')}</Heading>
        {info.openNow === null ? null : (
          <Badge
            label={info.openNow ? t('openNow') : t('closedNow')}
            tone={info.openNow ? 'success' : 'neutral'}
          />
        )}
      </View>

      <Text style={[styles.text, { color: colors.ink, fontWeight: '600' }]}>
        {t('address', { address: info.address })}
      </Text>

      {info.openNow === null ? null : (
        <Text
          style={{
            color: info.openNow ? colors.green : colors.muted,
            fontWeight: '700',
            fontSize: 13,
          }}
        >
          {info.openNow ? t('openNow') : t('closedNow')}{' '}
          <Text style={{ fontWeight: '400', color: colors.muted }}>
            {t('clockNote')}
          </Text>
        </Text>
      )}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: 12,
        }}
      >
        <View style={{ flex: isWide ? 1 : undefined, gap: 4 }}>
          <Text style={styles.sectionLabel}>{t('openingHours')}</Text>
          {info.hours.map((line) => (
            <Text key={line.days} style={styles.text}>
              {line.days}: {line.text}
            </Text>
          ))}
        </View>

        <View style={{ flex: isWide ? 1.2 : undefined, gap: 6 }}>
          <Text style={styles.sectionLabel}>{t('pricesTitle')}</Text>
          {info.prices.map((row) => (
            <View
              key={row.kind}
              style={{
                padding: 8,
                borderRadius: 10,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={[styles.text, { fontSize: 13, color: colors.ink }]}>
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

      <Text style={[styles.text, { fontSize: 12 }]}>{t('venueDemoNote')}</Text>
    </Card>
  );
}
