import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { getAllVenues } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Badge, Button, Card, colors, styles } from './ui';

export function SimulatorBar() {
  const store = useAppStore((state) => state);
  const allVenues = getAllVenues(store.customVenues);
  const activeVenue = allVenues.find((v) => v.id === store.venueId);
  const venueSessions = store.sessions.filter(
    (s) => s.venueId === store.venueId,
  );

  return (
    <Card variant="subtle" style={{ padding: 10, gap: 6 }}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: activeVenue?.accent ?? colors.green,
            }}
          />
          <Text
            style={{
              fontWeight: '800',
              fontSize: 11,
              letterSpacing: 0.6,
              color: colors.ink,
            }}
          >
            SIMULATOR
          </Text>
        </View>
        <View style={styles.row}>
          <Badge
            label={store.role === 'merchant' ? 'Merchant' : 'Customer'}
            tone={store.role === 'merchant' ? 'info' : 'success'}
          />
          {activeVenue ? (
            <Badge
              label={`${venueSessions.length}/${activeVenue.seats.length} busy`}
              tone="neutral"
            />
          ) : null}
        </View>
      </View>

      <View style={[styles.row, { gap: 6 }]}>
        {(['merchant', 'customer'] as const).map((role) => (
          <Button
            key={role}
            size="sm"
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
        {allVenues.map((venue) => (
          <Button
            key={venue.id}
            size="sm"
            label={venue.name}
            selected={store.venueId === venue.id}
            onPress={() => store.setVenue(venue.id)}
          />
        ))}
      </View>

      <View style={[styles.row, { gap: 6 }]}>
        <Button
          size="sm"
          label="Morning · 7/8 seats"
          selected={store.scenario === 'morning'}
          onPress={() => store.setScenario('morning')}
        />
        <Button
          size="sm"
          label="Afternoon · 2/8 seats"
          selected={store.scenario === 'afternoon'}
          onPress={() => store.setScenario('afternoon')}
        />
        <Button
          size="sm"
          label="+30m · all venues"
          onPress={store.advanceTime}
        />
        <Button
          size="sm"
          variant="danger"
          label="Reset all demo data"
          onPress={() => {
            store.reset();
            router.replace('/merchant/live-floor');
          }}
        />
      </View>
    </Card>
  );
}
