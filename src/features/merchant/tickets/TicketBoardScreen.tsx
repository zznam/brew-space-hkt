import { Text, View } from 'react-native';
import { formatMoney, getVenue, type Venue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Button,
  Card,
  colors,
  Eyebrow,
  Heading,
  styles,
} from '@/components/ui';
import { MerchantNav } from '../MerchantNav';
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
}: {
  order: PosOrder;
  venue: Venue;
  advanceTo: FulfillmentStatus | null;
  actionLabel: string | null;
}) {
  const label = ticketLabel(order, venue);
  return (
    <View
      style={{
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSubtle,
        gap: 10,
      }}
    >
      <Text style={[styles.text, { color: colors.ink, fontWeight: '700' }]}>
        {label} ·{' '}
        {order.lines.map((line) => `${line.name} ×${line.quantity}`).join(', ')}{' '}
        · {formatMoney(calculateOrderTotal(order))}
      </Text>
      {advanceTo && actionLabel && (
        <View style={styles.row}>
          <Button
            size="sm"
            variant="primary"
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
  const venue = getVenue(venueId);
  const orders = usePosStore((state) => state.orders).filter(
    (order) => order.venueId === venueId && order.fulfillment !== null,
  );
  return (
    <>
      <MerchantNav current="tickets" />

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ gap: 4 }}>
            <Eyebrow color={venue.accent}>
              MERCHANT / KITCHEN & BAR TICKETS
            </Eyebrow>
            <Heading>{venue.name} · Fulfillment Queue</Heading>
          </View>
          <Badge label={`${orders.length} total tickets`} tone="info" />
        </View>
        <Text style={styles.text}>
          Advance paid orders step-by-step from Queued → Preparing → Ready →
          Served.
        </Text>
      </Card>

      {COLUMNS.map((column) => {
        const tickets = orders.filter(
          (order) => order.fulfillment === column.status,
        );
        return (
          <Card key={column.status}>
            <View style={styles.rowBetween}>
              <Heading>{column.title}</Heading>
              <Badge label={`${tickets.length}`} tone={column.tone} />
            </View>
            {tickets.length === 0 ? (
              <Text style={styles.text}>No tickets.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {tickets.map((order) => (
                  <TicketLine
                    key={order.id}
                    order={order}
                    venue={venue}
                    advanceTo={column.advanceTo}
                    actionLabel={column.actionLabel}
                  />
                ))}
              </View>
            )}
          </Card>
        );
      })}
    </>
  );
}
