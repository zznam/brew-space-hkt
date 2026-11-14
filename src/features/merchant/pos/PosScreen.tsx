import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, styles } from '@/components/ui';
import { MenuGrid } from './MenuGrid';
import { CartPanel } from './CartPanel';
import { calculateOrderTotal } from './posStore';
import { posStore, usePosStore } from './usePosStore';

export function PosScreen() {
  const venueId = useAppStore((state) => state.venueId);
  const selectedSeatId = useAppStore((state) => state.selectedSeatId);
  const orders = usePosStore((state) => state.orders);
  const soldOutItemIds = usePosStore((state) => state.soldOutItemIds);
  const [justPaid, setJustPaid] = useState(false);
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
        <Heading>{seatLabel ? `Sell to ${seatLabel}` : 'Walk-in order'}</Heading>
        <MenuGrid
          venue={venue}
          soldOutItemIds={soldOutItemIds}
          onAdd={(item) => {
            if (!draftOrder) return;
            posStore
              .getState()
              .addLine(draftOrder.id, item.id, item.name, item.price);
          }}
          onToggleSoldOut={(itemId) =>
            posStore.getState().toggleSoldOut(itemId)
          }
        />
      </Card>
      <Card>
        <CartPanel
          order={draftOrder ?? null}
          onIncrement={(itemId) => {
            if (!draftOrder) return;
            const item = venue.menu.find((entry) => entry.id === itemId);
            if (item)
              posStore
                .getState()
                .addLine(draftOrder.id, item.id, item.name, item.price);
          }}
          onDecrement={(itemId) => {
            if (!draftOrder) return;
            const line = draftOrder.lines.find(
              (entry) => entry.menuItemId === itemId,
            );
            if (line)
              posStore
                .getState()
                .setLineQuantity(draftOrder.id, itemId, line.quantity - 1);
          }}
          onPay={(method) => {
            if (!draftOrder) return;
            const result = posStore.getState().pay(draftOrder.id, method);
            if (result.ok) setJustPaid(true);
          }}
          onCancel={() => {
            if (draftOrder) posStore.getState().cancelOrder(draftOrder.id);
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
