import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { formatMoney, type Seat } from '@/core';
import { Badge, Button, Card, colors, styles } from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import { buildSeatLink } from './deepLink';
import { kindWord, seatLabelText, venueMessages } from './messages';
import { describeAmenities, seatAmenities } from './seatAmenities';
import { estimateSeat, seatStatusText } from './venueModel';

interface Props {
  seat: Seat;
  occupied: boolean;
}

/** F135 seat detail card plus F137 "Share this seat". Render with
 * `key={seat.id}` so the share state resets when the seat changes. The status
 * never says who sits in an occupied seat. */
export function SeatDetailCard({ seat, occupied }: Props) {
  const { t, lang } = useT(venueMessages);
  const [shared, setShared] = useState<{
    link: string;
    copied: boolean;
  } | null>(null);
  const amenities = seatAmenities(seat);
  const estimates = estimateSeat(seat);

  async function share() {
    const origin =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : null;
    const link = buildSeatLink(seat.venueId, seat.id, origin);
    let copied = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch {
      copied = false;
    }
    setShared({ link, copied });
  }

  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text accessibilityRole="header" style={styles.subheading}>
          {t('seatDetails', { seat: seatLabelText(seat.label, lang) })}
        </Text>
        <Badge
          label={seatStatusText(occupied, lang)}
          tone={occupied ? 'info' : 'success'}
        />
      </View>

      <Text style={styles.textStrong}>
        {t('seatTypeStatus', {
          kind: kindWord(seat.kind, lang),
          status: seatStatusText(occupied, lang),
        })}
      </Text>

      <Text style={styles.text}>
        {t('seatAmenities', { amenities: describeAmenities(amenities, lang) })}
      </Text>

      <View style={styles.inset}>
        <Text style={styles.textStrong}>
          {t('seatRate', {
            rate: formatMoney(seat.hourlyRate),
            metered: formatMoney(estimates.metered1h),
            b2: formatMoney(estimates.bundle2h),
            b4: formatMoney(estimates.bundle4h),
          })}
        </Text>
      </View>

      <Text style={styles.caption}>{t('seatDemoNote')}</Text>

      <View style={styles.row}>
        <Button size="sm" label={t('shareSeat')} onPress={() => void share()} />
      </View>

      {shared ? (
        <View style={styles.inset}>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.textStrong, { color: colors.green }]}
          >
            {shared.copied ? t('linkCopied') : t('linkCopyManually')}
          </Text>
          <Text selectable style={styles.caption}>
            {shared.link}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
