import { Text, View } from 'react-native';
import { formatMoney, getVenue, type Venue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { calculateOrderTotal, ticketLabel } from '../pos/posStore';
import type { FulfillmentStatus, PosOrder } from '../pos/types';
import { posStore, usePosStore } from '../pos/usePosStore';

const COLUMNS: {
  status: FulfillmentStatus;
  title: string;
  tone: 'warning' | 'info' | 'success' | 'neutral';
  advanceTo: FulfillmentStatus | null;
  actionLabel: string | null;
}[] = [
  {
    status: 'queued',
    title: 'Queued',
    tone: 'warning',
    advanceTo: 'preparing',
    actionLabel: 'Start preparing',
  },
  {
    status: 'preparing',
    title: 'Preparing',
    tone: 'info',
    advanceTo: 'ready',
    actionLabel: 'Mark ready',
  },
  {
    status: 'ready',
    title: 'Ready',
    tone: 'success',
    advanceTo: 'served',
    actionLabel: 'Mark served',
  },
  {
    status: 'served',
    title: 'Served',
    tone: 'neutral',
    advanceTo: null,
    actionLabel: null,
  },
];

function TicketLine({
  order,
  venue,
  advanceTo,
  actionLabel,
  isPrimary,
  fullWidth,
}: {
  order: PosOrder;
  venue: Venue;
  advanceTo: FulfillmentStatus | null;
  actionLabel: string | null;
  isPrimary: boolean;
  fullWidth: boolean;
}) {
  const label = ticketLabel(order, venue);
  return (
    <View style={[styles.inset, { gap: space.sm }]}>
      <Text style={styles.textStrong}>
        {label} ·{' '}
        {order.lines.map((line) => `${line.name} ×${line.quantity}`).join(', ')}{' '}
        · {formatMoney(calculateOrderTotal(order))}
      </Text>
      {advanceTo && actionLabel && (
        <View style={styles.row}>
          <Button
            variant={isPrimary ? 'primary' : 'secondary'}
            fullWidth={fullWidth}
            label={`${actionLabel}, ${label}`}
            onPress={() =>
              posStore.getState().advanceTicket(order.id, advanceTo)
            }
          />
        </View>
      )}
    </View>
  );
}

export function TicketBoardScreen() {
  const venueId = useAppStore((state) => state.venueId);
  const { isWide } = useResponsive();
  const venue = getVenue(venueId);
  const orders = usePosStore((state) => state.orders).filter(
    (order) => order.venueId === venueId && order.fulfillment !== null,
  );
  const firstActionableOrderId = orders.find(
    (order) =>
      order.fulfillment === 'queued' ||
      order.fulfillment === 'preparing' ||
      order.fulfillment === 'ready',
  )?.id;

  return (
    <Screen>
      <ScreenHeader
        overline="MERCHANT / KITCHEN & BAR"
        accentColor={venue.accent}
        title="Tickets"
        subtitle={`${venue.name} · Queued → Preparing → Ready → Served`}
        trailing={<Badge label={`${orders.length} tickets`} tone="info" />}
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          message="Paid orders from New order appear here."
        />
      ) : null}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          flexWrap: isWide ? 'wrap' : 'nowrap',
          gap: space.md,
          alignItems: 'stretch',
        }}
      >
        {COLUMNS.map((column) => {
          const tickets = orders.filter(
            (order) => order.fulfillment === column.status,
          );
          return (
            <Card
              key={column.status}
              style={
                isWide
                  ? { flex: 1, minWidth: 230, maxWidth: '100%' }
                  : undefined
              }
            >
              <View style={styles.rowBetween}>
                <Heading level={2}>{column.title}</Heading>
                <Badge label={`${tickets.length}`} tone={column.tone} />
              </View>
              {tickets.length === 0 ? null : (
                <View style={{ gap: space.sm }}>
                  {tickets.map((order) => (
                    <TicketLine
                      key={order.id}
                      order={order}
                      venue={venue}
                      advanceTo={column.advanceTo}
                      actionLabel={column.actionLabel}
                      isPrimary={order.id === firstActionableOrderId}
                      fullWidth={!isWide}
                    />
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
