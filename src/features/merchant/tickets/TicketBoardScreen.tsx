import { Text } from 'react-native';
import { formatMoney, getVenue, type Venue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, styles } from '@/components/ui';
import { calculateOrderTotal, ticketLabel } from '../pos/posStore';
import type { FulfillmentStatus, PosOrder } from '../pos/types';
import { posStore, usePosStore } from '../pos/usePosStore';

const COLUMNS: {
  status: FulfillmentStatus;
  title: string;
  advanceTo: FulfillmentStatus | null;
  actionLabel: string | null;
}[] = [
  {
    status: 'queued',
    title: 'Queued',
    advanceTo: 'preparing',
    actionLabel: 'Start preparing',
  },
  {
    status: 'preparing',
    title: 'Preparing',
    advanceTo: 'ready',
    actionLabel: 'Mark ready',
  },
  {
    status: 'ready',
    title: 'Ready',
    advanceTo: 'served',
    actionLabel: 'Mark served',
  },
  { status: 'served', title: 'Served', advanceTo: null, actionLabel: null },
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
    <>
      <Text style={styles.text}>
        {label} ·{' '}
        {order.lines.map((line) => `${line.name} ×${line.quantity}`).join(', ')}{' '}
        · {formatMoney(calculateOrderTotal(order))}
      </Text>
      {advanceTo && actionLabel && (
        <Button
          label={`${actionLabel}, ${label}`}
          onPress={() => posStore.getState().advanceTicket(order.id, advanceTo)}
        />
      )}
    </>
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
      {COLUMNS.map((column) => {
        const tickets = orders.filter(
          (order) => order.fulfillment === column.status,
        );
        return (
          <Card key={column.status}>
            <Heading>{column.title}</Heading>
            {tickets.length === 0 ? (
              <Text style={styles.text}>No tickets.</Text>
            ) : (
              tickets.map((order) => (
                <TicketLine
                  key={order.id}
                  order={order}
                  venue={venue}
                  advanceTo={column.advanceTo}
                  actionLabel={column.actionLabel}
                />
              ))
            )}
          </Card>
        );
      })}
    </>
  );
}
