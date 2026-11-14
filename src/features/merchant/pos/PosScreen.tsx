import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, styles } from '@/components/ui';
import { MenuGrid } from './MenuGrid';
import { CartPanel } from './CartPanel';
import { calculateOrderTotal } from './posStore';
import { posStore, usePosStore } from './usePosStore';

export function PosScreen() {
  // The seat comes from the route, not the shared app-store selection:
  // selectedSeatId persists across reloads and is shared with the customer
  // flow, so reading it here would silently turn "New order" into a seat
  // order whenever a seat happened to be selected elsewhere.
  const { seatId: routeSeatId } = useLocalSearchParams<{ seatId?: string }>();
  const selectedSeatId = routeSeatId ?? null;
  const venueId = useAppStore((state) => state.venueId);
  const orders = usePosStore((state) => state.orders);
  const soldOutItemIds = usePosStore((state) => state.soldOutItemIds);
  const [justPaid, setJustPaid] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const venue = getVenue(venueId);

  const draftOrder = orders.find(
    (order) =>
      order.venueId === venueId &&
      order.seatId === selectedSeatId &&
      order.status === 'draft',
  );

  useEffect(() => {
    const current = posStore
      .getState()
      .orders.find(
        (order) =>
          order.venueId === venueId &&
          order.seatId === selectedSeatId &&
          order.status === 'draft',
      );
    if (!current) posStore.getState().createOrder(venueId, selectedSeatId);
  }, [venueId, selectedSeatId]);

  const seatLabel = selectedSeatId
    ? venue.seats.find((seat) => seat.id === selectedSeatId)?.label
    : null;

  if (justPaid) {
    return (
      <Card>
        <Heading>Order sent to the kitchen.</Heading>
        <Button
          label="Start a new order"
          onPress={() => {
            posStore.getState().createOrder(venueId, selectedSeatId);
            setJustPaid(false);
          }}
        />
      </Card>
    );
  }

  const otherOpenOrders = orders.filter(
    (order) =>
      order.venueId === venueId &&
      order.id !== draftOrder?.id &&
      (order.status === 'draft' || order.status === 'awaiting_payment'),
  );

  return (
    <>
      <Card>
        <Heading>
          {seatLabel ? `Sell to ${seatLabel}` : 'Walk-in order'}
        </Heading>
        {actionError && (
          <Text accessibilityRole="alert" style={styles.text}>
            {actionError}
          </Text>
        )}
        <MenuGrid
          venue={venue}
          soldOutItemIds={soldOutItemIds}
          onAdd={(item) => {
            if (!draftOrder) return;
            const result = posStore
              .getState()
              .addLine(draftOrder.id, item.id, item.name, item.price);
            setActionError(result.ok ? null : result.message);
          }}
          onToggleSoldOut={(itemId) =>
            posStore.getState().toggleSoldOut(itemId)
          }
        />
      </Card>
      <Card>
        <CartPanel
          order={draftOrder ?? null}
          soldOutItemIds={soldOutItemIds}
          onIncrement={(itemId) => {
            if (!draftOrder) return;
            const item = venue.menu.find((entry) => entry.id === itemId);
            if (!item) return;
            const result = posStore
              .getState()
              .addLine(draftOrder.id, item.id, item.name, item.price);
            setActionError(result.ok ? null : result.message);
          }}
          onDecrement={(itemId) => {
            if (!draftOrder) return;
            const line = draftOrder.lines.find(
              (entry) => entry.menuItemId === itemId,
            );
            if (!line) return;
            const result = posStore
              .getState()
              .setLineQuantity(draftOrder.id, itemId, line.quantity - 1);
            setActionError(result.ok ? null : result.message);
          }}
          onPay={(method) => {
            if (!draftOrder) return;
            const result = posStore.getState().pay(draftOrder.id, method);
            if (result.ok) setJustPaid(true);
            else setActionError(result.message);
          }}
          onCancel={() => {
            if (!draftOrder) return;
            const result = posStore.getState().cancelOrder(draftOrder.id);
            if (result.ok) {
              setActionError(null);
              posStore.getState().createOrder(venueId, selectedSeatId);
            } else {
              setActionError(result.message);
            }
          }}
        />
      </Card>
      <Card>
        <Heading>Other open orders</Heading>
        {otherOpenOrders.length === 0 ? (
          <Text style={styles.text}>No other open orders.</Text>
        ) : (
          otherOpenOrders.map((order) => (
            <Text key={order.id} style={styles.text}>
              {order.seatId
                ? venue.seats.find((seat) => seat.id === order.seatId)?.label
                : 'Walk-in'}{' '}
              · {formatMoney(calculateOrderTotal(order))}
            </Text>
          ))
        )}
      </Card>
    </>
  );
}
