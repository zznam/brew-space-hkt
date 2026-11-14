import { router } from 'expo-router';
import { Text } from 'react-native';
import { calculateBill, DEMO_CUSTOMER_ID, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, styles } from '@/components/ui';
import { CartPanel } from './cart/CartPanel';
import { MenuList } from './cart/MenuList';
import { OrderHistory } from './cart/OrderHistory';
import { CustomerNav } from './shared/CustomerNav';
import { finishSession } from './shared/finishSession';
import { SessionStatusBanner } from './support/SessionStatusBanner';
import { SupportPanel } from './support/SupportPanel';
import { VenueInfoCard } from './support/VenueInfoCard';
export function ActiveSessionScreen() {
  const store = useAppStore((state) => state);
  const venue = getVenue(store.venueId);
  const session = store.sessions.find(
    (entry) =>
      entry.venueId === venue.id && entry.customerId === DEMO_CUSTOMER_ID,
  );
  if (!session)
    return (
      <Card>
        <CustomerNav current="session" />
        <Heading>Your next focus session</Heading>
        <Text style={styles.text}>
          You have no active demo session at {venue.name}.
        </Text>
        <Button
          label="Explore seats"
          onPress={() => router.replace('/customer/explore')}
        />
      </Card>
    );
  const bill = calculateBill(session);
  const seatLabel =
    venue.seats.find((seat) => seat.id === session.seatId)?.label ?? '';
  return (
    <Card>
      <CustomerNav current="session" />
      <Heading>Your live tab</Heading>
      <Text style={styles.text}>
        {venue.name} · {seatLabel} · {session.elapsedMinutes} minutes ·{' '}
        {session.mode}
      </Text>
      <SessionStatusBanner session={session} />
      <MenuList venueId={venue.id} />
      <CartPanel session={session} />
      <OrderHistory session={session} />
      <SupportPanel
        context={{
          venueId: venue.id,
          seatId: session.seatId,
          sessionId: session.id,
          minute: session.elapsedMinutes,
        }}
      />
      <VenueInfoCard venueId={venue.id} />
      <Text style={styles.text}>
        {session.orders.length} items added · Seat time {formatMoney(bill.time)}{' '}
        · Menu {formatMoney(bill.items)}
      </Text>
      <Heading>{formatMoney(bill.total)}</Heading>
      <Text style={styles.text}>
        Demo estimate only. Ending this session releases the seat and clears its
        tab; it does not collect payment.
      </Text>
      <Button
        label="End demo session"
        onPress={() => {
          if (finishSession(session).ok) router.replace('/customer/receipt');
        }}
      />
    </Card>
  );
}
