import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatMoney, type Venue } from '@/core';
import { Card, Heading, colors, styles } from '@/components/ui';
import { venuePageInfo } from './venueModel';

const KIND_LABEL = { desk: 'Desk', pod: 'Pod', booth: 'Booth' } as const;

/** F131: hours, address and seat price table, shown before a seat is chosen.
 * All details are demo data; prices come from the core billing function. */
export function VenuePage({ venue }: { venue: Venue }) {
  // Read once per mount: "open now" is the device clock in venue time.
  const [now] = useState(() => new Date());
  const info = venuePageInfo(venue, now);
  return (
    <Card>
      <Heading>Hours, address and prices</Heading>
      <Text style={styles.text}>Address: {info.address}</Text>
      {info.openNow === null ? null : (
        <Text
          style={{
            color: info.openNow ? colors.green : colors.muted,
            fontWeight: '700',
          }}
        >
          {info.openNow ? 'Open now' : 'Closed now'}{' '}
          <Text style={{ fontWeight: '400' }}>
            (device clock, venue time UTC+7)
          </Text>
        </Text>
      )}
      <View style={{ gap: 2 }}>
        <Text style={{ fontWeight: '700' }}>Opening hours</Text>
        {info.hours.map((line) => (
          <Text key={line.days} style={styles.text}>
            {line.days}: {line.text}
          </Text>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '700' }}>Seat prices by type</Text>
        {info.prices.map((row) => (
          <Text key={row.kind} style={styles.text}>
            {KIND_LABEL[row.kind]} ({row.seatCount}):{' '}
            {row.varies ? 'from ' : ''}
            {formatMoney(row.hourlyRate)}/h · 2h bundle{' '}
            {formatMoney(row.bundle2h)} · 4h bundle {formatMoney(row.bundle4h)}
          </Text>
        ))}
      </View>
      <Text style={styles.text}>
        Demo venue details and estimates. Bundles are 15% off seat time, before
        any food or drinks.
      </Text>
    </Card>
  );
}
