import { Text } from 'react-native';
import { calculateBill, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import { Card, Heading, styles } from '@/components/ui';
export function LiveFloorScreen() {
  const store = useAppStore((state) => state);
  const venue = getVenue(store.venueId);
  const sessions = store.sessions.filter(
    (session) => session.venueId === venue.id,
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
