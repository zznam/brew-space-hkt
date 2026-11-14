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
    <Card variant="subtle" style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
              fontSize: 12,
              letterSpacing: 0.6,
              color: colors.ink,
            }}
          >
            DEMO CONTROLS · local device only
          </Text>
        </View>
        <View style={styles.row}>
          <Badge
            label={`Role: ${store.role === 'merchant' ? 'Merchant' : 'Customer'}`}
            tone={store.role === 'merchant' ? 'info' : 'success'}
          />
          {activeVenue ? (
            <Badge
              label={`${venueSessions.length}/${activeVenue.seats.length} occupied`}
              tone="neutral"
            />
          ) : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <View style={{ gap: 6 }}>
          <Text style={styles.sectionLabel}>Experience Mode</Text>
          <View style={styles.row}>
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
          </View>
        </View>

        <View style={{ gap: 6, flex: 1, minWidth: 260 }}>
          <Text style={styles.sectionLabel}>Active Cafe Venue</Text>
          <View style={styles.row}>
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
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={styles.sectionLabel}>Time & Occupancy Scenarios</Text>
        <View style={styles.row}>
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
      </View>

      <Text style={[styles.text, { fontSize: 13 }]}>
        Scenario buttons replace sessions in the current venue. Time advances
        only with +30m. No real bookings or payments.
      </Text>
    </Card>
  );
}
