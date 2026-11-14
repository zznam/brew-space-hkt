import { Text, View } from 'react-native';
import { formatMoney, type Session } from '@/core';
import { Button, colors, Heading, styles } from '@/components/ui';
import { orderStatus, ordersForSession, type OrderStatus } from './cartModel';
import { useCart } from './useCart';

const STATUS_LABEL: Record<OrderStatus, string> = {
  queued: 'Status: Queued',
  preparing: 'Status: Preparing',
  served: 'Status: Served',
};

export function OrderHistory({ session }: { session: Session }) {
  const allOrders = useCart((state) => state.orders);
  const reorder = useCart((state) => state.reorder);
  const orders = ordersForSession(allOrders, session);
  const latestId = orders[orders.length - 1]?.id;
  return (
    <View style={{ gap: 10 }}>
      <Heading>Your orders</Heading>
      {orders.length === 0 && (
        <Text style={styles.text}>
          No orders yet. Orders you place appear here with their status.
        </Text>
      )}
      {[...orders].reverse().map((order) => (
        <View
          key={order.id}
          style={{
            gap: 6,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 10,
          }}
        >
          <Text style={{ color: colors.ink, fontWeight: '600' }}>
            {STATUS_LABEL[orderStatus(order, session.elapsedMinutes)]} ·{' '}
            {formatMoney(order.total)}
          </Text>
          {order.lines.map((line) => (
            <Text key={line.menuItemId} style={styles.text}>
              {line.quantity} × {line.name}
              {line.note ? ` (${line.note})` : ''}
            </Text>
          ))}
          {order.id === latestId && (
            <View style={styles.row}>
              <Button label="Order again" onPress={() => reorder(session)} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
