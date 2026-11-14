import { Text, View } from 'react-native';
import { formatMoney, type Session } from '@/core';
import { Badge, Button, Card, Heading, styles } from '@/components/ui';
import {
  formatModifiers,
  lineKey,
  orderStatus,
  ordersForSession,
  type OrderStatus,
} from './cartModel';
import { useT } from '../../../i18n/useLanguage';
import { useLoyaltyReady } from '../loyalty/useLoyalty';
import { cartMessages } from './messages';
import { useCart } from './useCart';

const STATUS_KEY = {
  queued: 'statusQueued',
  preparing: 'statusPreparing',
  served: 'statusServed',
} as const satisfies Record<OrderStatus, string>;

export function OrderHistory({
  session,
  disabledReason = null,
}: {
  session: Session;
  disabledReason?: string | null;
}) {
  const { t, lang } = useT(cartMessages);
  const allOrders = useCart((state) => state.orders);
  const reorder = useCart((state) => state.reorder);
  const { ready } = useLoyaltyReady();
  const orders = ordersForSession(allOrders, session);
  const latestId = orders[orders.length - 1]?.id;
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading>{t('ordersTitle')}</Heading>
        <Badge label={`${orders.length}`} tone="neutral" />
      </View>

      {orders.length === 0 && (
        <Text style={styles.text}>{t('ordersEmpty')}</Text>
      )}

      {[...orders].reverse().map((order) => {
        const status = orderStatus(order, session.elapsedMinutes);
        return (
          <View key={order.id} style={styles.inset}>
            <View style={styles.rowBetween}>
              <Text style={styles.textStrong}>
                {t(STATUS_KEY[status])} · {formatMoney(order.total)}
              </Text>
              <Badge
                label={status}
                tone={
                  status === 'served'
                    ? 'success'
                    : status === 'preparing'
                      ? 'info'
                      : 'warning'
                }
              />
            </View>
            {order.lines.map((line) => {
              const options = formatModifiers(line.modifiers, lang);
              return (
                <Text key={lineKey(line)} style={styles.text}>
                  {line.quantity} × {line.name}
                  {options ? ` · ${options}` : ''}
                  {line.note ? ` (${line.note})` : ''}
                </Text>
              );
            })}
            {order.id === latestId && (
              <View style={styles.row}>
                <Button
                  size="sm"
                  label={t('orderAgain')}
                  disabled={!ready || disabledReason !== null}
                  onPress={() => reorder(session)}
                />
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}
