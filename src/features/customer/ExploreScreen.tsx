import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { getVenue, type BillingMode } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import { Button, Card, Heading, styles } from '@/components/ui';
export function ExploreScreen() {
  const store = useAppStore((state) => state);
  const venue = getVenue(store.venueId);
  const [error, setError] = useState('');
  function start(mode: BillingMode) {
    const result = store.startSession(mode);
    if (!result.ok) setError(result.message);
    else {
      setError('');
      router.push('/customer/active-session');
    }
  }
  return (
    <Card>
      <Text style={{ color: venue.accent, fontWeight: '700' }}>
        CUSTOMER / FIND YOUR SPACE
      </Text>
      <Heading>{venue.name}</Heading>
      <Text style={styles.text}>
        {venue.description} Select an available seat to try a demo session.
      </Text>
      <SeatMap
        venue={venue}
        sessions={store.sessions}
        selectedSeatId={store.selectedSeatId}
        onSelect={(id) => {
          setError('');
          store.selectSeat(id);
        }}
      />
      <View style={styles.row}>
        <Button label="Start metered" onPress={() => start('METERED_OPEN')} />
        <Button
          label="2h bundle · 15% off"
          onPress={() => start('BUNDLE_2H')}
        />
        <Button
          label="4h bundle · 15% off"
          onPress={() => start('BUNDLE_4H')}
        />
        <Button
          label="My session"
          onPress={() => router.push('/customer/active-session')}
        />
      </View>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Text style={styles.text}>
        Demo estimates in VND. Metered time rounds up to 15 minutes; bundles
        include a 10 minute overtime grace period.
      </Text>
    </Card>
  );
}
