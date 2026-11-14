import { Text, View } from 'react-native';
import { formatMoney } from '@/core';
import { Button, Heading, styles } from '@/components/ui';
import { calculateOrderTotal } from './posStore';
import type { PaymentMethod, PosOrder } from './types';

export interface CartPanelProps {
  order: PosOrder | null;
  onIncrement: (menuItemId: string) => void;
  onDecrement: (menuItemId: string) => void;
  onPay: (method: PaymentMethod) => void;
  onCancel: () => void;
}

export function CartPanel({
  order,
  onIncrement,
  onDecrement,
  onPay,
  onCancel,
}: CartPanelProps) {
  const empty = !order || order.lines.length === 0;
  return (
    <View style={{ gap: 14 }}>
      {empty || !order ? (
        <Text style={styles.text}>Cart is empty. Add an item to start.</Text>
      ) : (
        <>
          {order.lines.map((line) => (
            <View key={line.menuItemId} style={styles.row}>
              <Text style={styles.text}>
                {line.name} × {line.quantity} ·{' '}
                {formatMoney(line.unitPrice * line.quantity)}
              </Text>
              <Button
                label="-"
                onPress={() => onDecrement(line.menuItemId)}
              />
              <Button
                label="+"
                onPress={() => onIncrement(line.menuItemId)}
              />
            </View>
          ))}
          <Heading>{formatMoney(calculateOrderTotal(order))}</Heading>
        </>
      )}
      <View style={styles.row}>
        <Button label="Pay cash" onPress={() => onPay('cash')} disabled={empty} />
        <Button
          label="Pay online"
          onPress={() => onPay('online')}
          disabled={empty}
        />
        <Button label="Cancel order" onPress={onCancel} disabled={!order} />
      </View>
    </View>
  );
}
