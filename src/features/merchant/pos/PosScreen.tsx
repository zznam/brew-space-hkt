import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Button,
  Card,
  colors,
  Eyebrow,
  Heading,
  styles,
  useResponsive,
} from '@/components/ui';
import { MerchantNav } from '../MerchantNav';
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
      <>
        <MerchantNav current="pos" />
        <Card variant="accent">
          <Eyebrow color={colors.green}>MERCHANT / POS CHECKOUT</Eyebrow>
          <Heading>Order sent to the kitchen.</Heading>
          <Text style={styles.text}>
            Queued on the fulfillment board for {venue.name}.
          </Text>
          <View style={styles.row}>
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
              onPress={() => router.push('/merchant/tickets')}
            />
            <Button
              label="Back to Live Floor"
              onPress={() => router.push('/merchant/live-floor')}
            />
          </View>
        </Card>
      </>
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
      <MerchantNav current="pos" />

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <Card style={isWide ? { flex: 1.4 } : undefined}>
          <View style={styles.rowBetween}>
            <View style={{ gap: 2 }}>
              <Eyebrow color={venue.accent}>MERCHANT / POINT OF SALE</Eyebrow>
              <Heading>
                {seatLabel ? `Sell to ${seatLabel}` : 'Walk-in order'}
              </Heading>
            </View>
            <Badge
              label={seatLabel ? `Target: ${seatLabel}` : 'Walk-in'}
              tone={seatLabel ? 'info' : 'neutral'}
            />
          </View>

          {actionError && (
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.dangerSurface,
                borderWidth: 1,
                borderColor: colors.dangerBorder,
              }}
            >
              <Text
                accessibilityRole="alert"
                style={[
                  styles.text,
                  { color: colors.danger, fontWeight: '600' },
                ]}
              >
                {actionError}
              </Text>
            </View>
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

      <Card variant="subtle">
        <View style={styles.rowBetween}>
          <Heading style={{ fontSize: 18 }}>Other open orders</Heading>
          <Badge label={`${otherOpenOrders.length}`} tone="neutral" />
        </View>
        {otherOpenOrders.length === 0 ? (
          <Text style={styles.text}>No other open orders.</Text>
        ) : (
          otherOpenOrders.map((order) => (
            <View
              key={order.id}
              style={{
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={[styles.text, { color: colors.ink, fontWeight: '600' }]}
              >
                {order.seatId
                  ? venue.seats.find((seat) => seat.id === order.seatId)?.label
                  : 'Walk-in'}{' '}
                · {formatMoney(calculateOrderTotal(order))}
              </Text>
            </View>
          ))
        )}
      </Card>
    </>
  );
}
