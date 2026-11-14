import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { calculateBill, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import {
  Badge,
  Button,
  Card,
  colors,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  space,
  StatTile,
  styles,
  useResponsive,
} from '@/components/ui';

export function LiveFloorScreen() {
  const store = useAppStore((state) => state);
  const { isWide } = useResponsive();
  const venue = getVenue(store.venueId);
  const sessions = store.sessions.filter(
    (session) => session.venueId === venue.id,
  );
  const selectedSeat = venue.seats.find(
    (seat) => seat.id === store.selectedSeatId,
  );
  const liveRevenue = sessions.reduce(
    (sum, session) => sum + calculateBill(session).total,
    0,
  );
  const freeSeats = venue.seats.length - sessions.length;

  return (
    <Screen>
      <ScreenHeader
        overline="MERCHANT / LIVE FLOOR"
        accentColor={venue.accent}
        title={venue.name}
        subtitle={`${sessions.length} of ${venue.seats.length} seats occupied · ${venue.description}`}
      />

      <View style={styles.grid}>
        <StatTile
          label="Active"
          value={`${sessions.length}`}
          sublabel={`of ${venue.seats.length} seats`}
          accentColor={venue.accent}
        />
        <StatTile
          label="Available"
          value={`${freeSeats}`}
          sublabel="Ready now"
          accentColor={colors.green}
        />
        <StatTile
          label="Open Tabs"
          value={formatMoney(liveRevenue)}
          sublabel="Seat + menu"
        />
      </View>

      <Card>
        <SeatMap
          venue={venue}
          sessions={sessions}
          selectedSeatId={store.selectedSeatId}
          onSelect={store.selectSeat}
        />

        {selectedSeat && (
          <View style={styles.row}>
            <Button
              label={`Sell to ${selectedSeat.label}`}
              variant="primary"
              fullWidth={!isWide}
              onPress={() =>
                router.push({
                  pathname: '/merchant/pos',
                  params: { seatId: selectedSeat.id },
                })
              }
            />
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Heading level={2}>Live tabs</Heading>
          <Badge label={`${sessions.length} active`} tone="neutral" />
        </View>

        {sessions.length === 0 && (
          <EmptyState message="No active sessions. Switch to Customer to start one." />
        )}

        {sessions.map((session) => {
          const seat = venue.seats.find((s) => s.id === session.seatId);
          const isSelected = store.selectedSeatId === session.seatId;
          const total = calculateBill(session).total;
          return (
            <View
              key={session.id}
              style={[
                styles.inset,
                styles.insetRow,
                isSelected && { backgroundColor: colors.greenSurface },
              ]}
            >
              <View style={{ gap: space.xxs, flex: 1 }}>
                <Text style={styles.textStrong}>
                  {seat?.label} · {session.elapsedMinutes} min ·{' '}
                  {formatMoney(total)}
                  {isSelected ? ' · Selected' : ''}
                </Text>
                <Text style={styles.caption}>
                  {session.mode} · {session.orders.length} order line(s)
                </Text>
              </View>
              {seat ? (
                <Button
                  size="sm"
                  variant={isSelected ? 'secondary' : 'default'}
                  label={isSelected ? 'Selected' : 'Select seat'}
                  onPress={() => store.selectSeat(seat.id)}
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
