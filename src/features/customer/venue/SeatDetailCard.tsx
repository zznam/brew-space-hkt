import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { formatMoney, type Seat } from '@/core';
import { Button, Card, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
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
      <Text accessibilityRole="header" style={{ fontWeight: '700' }}>
        {t('seatDetails', { seat: seatLabelText(seat.label, lang) })}
      </Text>
      <Text style={styles.text}>
        {t('seatTypeStatus', {
          kind: kindWord(seat.kind, lang),
          status: seatStatusText(occupied, lang),
        })}
      </Text>
      <Text style={styles.text}>
        {t('seatAmenities', { amenities: describeAmenities(amenities, lang) })}
      </Text>
      <Text style={styles.text}>
        {t('seatRate', {
          rate: formatMoney(seat.hourlyRate),
          metered: formatMoney(estimates.metered1h),
          b2: formatMoney(estimates.bundle2h),
          b4: formatMoney(estimates.bundle4h),
        })}
      </Text>
      <Text style={styles.text}>{t('seatDemoNote')}</Text>
      <View style={styles.row}>
        <Button label={t('shareSeat')} onPress={() => void share()} />
      </View>
      {shared ? (
        <View style={{ gap: 4 }}>
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {shared.copied ? t('linkCopied') : t('linkCopyManually')}
          </Text>
          <Text selectable style={styles.text}>
            {shared.link}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
