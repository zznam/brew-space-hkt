import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Banner,
  Button,
  Card,
  colors,
  Eyebrow,
  Heading,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { MenuGrid } from './MenuGrid';
import { CartPanel } from './CartPanel';
import { calculateOrderTotal } from './posStore';
import { posStore, usePosStore } from './usePosStore';

export function PosScreen() {
  const { seatId: routeSeatId } = useLocalSearchParams<{ seatId?: string }>();
  const selectedSeatId = routeSeatId ?? null;
  const { isWide } = useResponsive();
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
      <Screen>
        <Card variant="accent">
          <Eyebrow color={colors.green}>MERCHANT / POS CHECKOUT</Eyebrow>
          <Heading>Order sent to the kitchen.</Heading>
          <Text style={styles.text}>
            Queued on the fulfillment board for {venue.name}.
          </Text>
          <View style={{ gap: space.sm }}>
            <Button
              label="Start a new order"
              variant="primary"
              fullWidth={!isWide}
              onPress={() => {
                posStore.getState().createOrder(venueId, selectedSeatId);
                setJustPaid(false);
              }}
            />
            <Button
              label="Open Ticket Board"
              variant="ghost"
              onPress={() => router.push('/merchant/tickets')}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  const otherOpenOrders = orders.filter(
    (order) =>
      order.venueId === venueId &&
      order.id !== draftOrder?.id &&
      (order.status === 'draft' || order.status === 'awaiting_payment'),
  );

  return (
    <Screen>
      <ScreenHeader
        overline="MERCHANT / POINT OF SALE"
        accentColor={venue.accent}
        title={seatLabel ? `Sell to ${seatLabel}` : 'Walk-in order'}
        trailing={
          <Badge
            label={seatLabel ? `Target: ${seatLabel}` : 'Walk-in'}
            tone={seatLabel ? 'info' : 'neutral'}
          />
        }
      />

      {actionError ? (
        <Banner tone="danger" role="alert">
          {actionError}
        </Banner>
      ) : null}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: space.lg,
        }}
      >
        <Card style={isWide ? { flex: 1.4 } : undefined}>
          <Text style={styles.sectionLabel}>Menu</Text>

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

        <Card style={isWide ? { flex: 1 } : undefined}>
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
      </View>

      {otherOpenOrders.length > 0 ? (
        <Card>
          <View style={styles.rowBetween}>
            <Heading level={2}>Other open orders</Heading>
            <Badge label={`${otherOpenOrders.length}`} tone="neutral" />
          </View>
          {otherOpenOrders.map((order) => (
            <View key={order.id} style={styles.inset}>
              <Text style={styles.textStrong}>
                {order.seatId
                  ? venue.seats.find((seat) => seat.id === order.seatId)?.label
                  : 'Walk-in'}{' '}
                · {formatMoney(calculateOrderTotal(order))}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
