import { router } from 'expo-router';
import { Text } from 'react-native';
import { calculateBill, DEMO_CUSTOMER_ID, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, styles } from '@/components/ui';
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
  return (
    <Card>
      <Heading>Your live tab</Heading>
      <Text style={styles.text}>
        {venue.name} · {session.elapsedMinutes} minutes · {session.mode}
      </Text>
      {venue.menu.map((item) => (
        <Button
          key={item.id}
          label={`Add ${item.name} · ${formatMoney(item.price)}`}
          onPress={() => store.addItem(session.id, item.id)}
        />
      ))}
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
          store.endSession(session.id);
          router.replace('/customer/explore');
        }}
      />
    </Card>
  );
}
