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
import { useT } from '@/i18n/useLanguage';
import { merchantMessages, ticketText } from '../messages';
import { calculateOrderTotal, ticketLabel } from '../pos/posStore';
import type { FulfillmentStatus, PosOrder } from '../pos/types';
import { posStore, usePosStore } from '../pos/usePosStore';

const COLUMNS: {
  status: FulfillmentStatus;
  tone: 'warning' | 'info' | 'success' | 'neutral';
  advanceTo: FulfillmentStatus | null;
  actionLabel: 'startPreparing' | 'markReady' | 'markServed' | null;
}[] = [
  {
    status: 'queued',
    tone: 'warning',
    advanceTo: 'preparing',
    actionLabel: 'startPreparing',
  },
  {
    status: 'preparing',
    tone: 'info',
    advanceTo: 'ready',
    actionLabel: 'markReady',
  },
  {
    status: 'ready',
    tone: 'success',
    advanceTo: 'served',
    actionLabel: 'markServed',
  },
  {
    status: 'served',
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
  actionLabel: 'startPreparing' | 'markReady' | 'markServed' | null;
  isPrimary: boolean;
  fullWidth: boolean;
}) {
  const { t, lang } = useT(merchantMessages);
  const label = ticketText(ticketLabel(order, venue), lang);
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
            label={t('ticketAction', {
              action: t(actionLabel),
              ticket: label,
            })}
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
  const { t } = useT(merchantMessages);
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
        overline={t('ticketsOverline')}
        accentColor={venue.accent}
        title={t('ticketsTitle')}
        subtitle={t('ticketsSubtitle', { venue: venue.name })}
        trailing={
          <Badge label={t('ticketCount', { n: orders.length })} tone="info" />
        }
      />

      {orders.length === 0 ? (
        <EmptyState title={t('noTicketsTitle')} message={t('noTicketsBody')} />
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
                <Heading level={2}>{t(column.status)}</Heading>
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
