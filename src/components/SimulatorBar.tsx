import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { getAllVenues } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, styles } from './ui';
export function SimulatorBar() {
  const store = useAppStore((state) => state);
  const allVenues = getAllVenues(store.customVenues);
  return (
    <Card>
      <Text style={{ fontWeight: '700' }}>
        DEMO CONTROLS · local device only
      </Text>
      <View style={styles.row}>
        {(['merchant', 'customer'] as const).map((role) => (
          <Button
            key={role}
            label={role === 'merchant' ? 'Merchant' : 'Customer'}
            selected={store.role === role}
            onPress={() => {
              store.setRole(role);
              router.replace(
                role === 'merchant'
                  ? '/merchant/live-floor'
                  : '/customer/explore',
              );
            }}
          />
        ))}
      </View>
      <View style={styles.row}>
        {allVenues.map((venue) => (
          <Button
            key={venue.id}
            label={venue.name}
            selected={store.venueId === venue.id}
            onPress={() => store.setVenue(venue.id)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Button
          label="Morning · 7/8 seats"
          onPress={() => store.setScenario('morning')}
        />
        <Button
          label="Afternoon · 2/8 seats"
          onPress={() => store.setScenario('afternoon')}
        />
        <Button label="+30m · all venues" onPress={store.advanceTime} />
        <Button
          label="Reset all demo data"
          onPress={() => {
            store.reset();
            router.replace('/merchant/live-floor');
          }}
        />
      </View>
      <Text style={styles.text}>
        Scenario buttons replace sessions in the current venue. Time advances
        only with +30m. No real bookings or payments.
      </Text>
    </Card>
  );
}
