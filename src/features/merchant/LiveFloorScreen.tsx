import { Text } from 'react-native';
import { router } from 'expo-router';
import { calculateBill, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import { Button, Card, Heading, styles } from '@/components/ui';
export function LiveFloorScreen() {
  const store = useAppStore((state) => state);
  const venue = getVenue(store.venueId);
  const sessions = store.sessions.filter(
    (session) => session.venueId === venue.id,
  );
  const selectedSeat = venue.seats.find(
    (seat) => seat.id === store.selectedSeatId,
  );
  return (
    <>
      <Card>
        <Text style={{ color: venue.accent, fontWeight: '700' }}>
          MERCHANT / LIVE FLOOR
        </Text>
        <Heading>{venue.name}</Heading>
        <Text style={styles.text}>
          {sessions.length} of {venue.seats.length} seats occupied ·{' '}
          {venue.description}
        </Text>
        <Button
          label="New order"
          onPress={() => router.push('/merchant/pos')}
        />
        {selectedSeat && (
          <Button
            label={`Sell to ${selectedSeat.label}`}
            onPress={() =>
              router.push({
                pathname: '/merchant/pos',
                params: { seatId: selectedSeat.id },
              })
            }
          />
        )}
        <Button
          label="Tickets"
          onPress={() => router.push('/merchant/tickets')}
        />
        <Button
          label="Onboard Cafe / 3D Studio"
          onPress={() => router.push('/merchant/onboarding')}
        />
        <SeatMap
          venue={venue}
          sessions={sessions}
          selectedSeatId={store.selectedSeatId}
          onSelect={store.selectSeat}
        />
      </Card>
      <Card>
        <Heading>Live tabs</Heading>
        {sessions.length === 0 && (
          <Text style={styles.text}>
            No active sessions. Switch to Customer to start one.
          </Text>
        )}
        {sessions.map((session) => (
          <Text key={session.id} style={styles.text}>
            {venue.seats.find((seat) => seat.id === session.seatId)?.label} ·{' '}
            {session.elapsedMinutes} min ·{' '}
            {formatMoney(calculateBill(session).total)}
            {store.selectedSeatId === session.seatId ? ' · Selected' : ''}
          </Text>
        ))}
      </Card>
    </>
  );
}
