import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { formatMoney, type Seat } from '@/core';
import { Button, Card, styles } from '@/components/ui';
import { buildSeatLink } from './deepLink';
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
        {seat.label} details
      </Text>
      <Text style={styles.text}>
        Type: {seat.kind} · Status: {seatStatusText(occupied)}
      </Text>
      <Text style={styles.text}>Amenities: {describeAmenities(amenities)}</Text>
      <Text style={styles.text}>
        Rate: {formatMoney(seat.hourlyRate)}/h. Estimates: 1h metered{' '}
        {formatMoney(estimates.metered1h)} · 2h bundle{' '}
        {formatMoney(estimates.bundle2h)} · 4h bundle{' '}
        {formatMoney(estimates.bundle4h)}
      </Text>
      <Text style={styles.text}>
        Demo estimates for seat time only. Amenities are sample data.
      </Text>
      <View style={styles.row}>
        <Button label="Share this seat" onPress={() => void share()} />
      </View>
      {shared ? (
        <View style={{ gap: 4 }}>
          <Text accessibilityLiveRegion="polite" style={styles.text}>
            {shared.copied
              ? 'Link copied. It holds only the venue and seat.'
              : 'Copy this link to share the seat. It holds only the venue and seat.'}
          </Text>
          <Text selectable style={styles.text}>
            {shared.link}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
