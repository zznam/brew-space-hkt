import { Text, View } from 'react-native';
import { formatMoney } from '@/core';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  Heading,
  styles,
} from '@/components/ui';
import { calculateOrderTotal } from './posStore';
import type { PaymentMethod, PosOrder } from './types';

export interface CartPanelProps {
  order: PosOrder | null;
  soldOutItemIds: string[];
  onIncrement: (menuItemId: string) => void;
  onDecrement: (menuItemId: string) => void;
  onPay: (method: PaymentMethod) => void;
  onCancel: () => void;
}

export function CartPanel({
  order,
  soldOutItemIds,
  onIncrement,
  onDecrement,
  onPay,
  onCancel,
}: CartPanelProps) {
  const empty = !order || order.lines.length === 0;
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.subheading}>Order Cart</Text>
        {order ? (
          <Badge label={`${order.lines.length} line(s)`} tone="neutral" />
        ) : null}
      </View>

      {empty || !order ? (
        <Card variant="subtle">
          <Text style={styles.text}>Cart is empty. Add an item to start.</Text>
        </Card>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {order.lines.map((line) => (
              <View
                key={line.menuItemId}
                style={[
                  styles.rowBetween,
                  {
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.text,
                    { color: colors.ink, fontWeight: '600', flex: 1 },
                  ]}
                >
                  {line.name} × {line.quantity} ·{' '}
                  {formatMoney(line.unitPrice * line.quantity)}
                </Text>
                <View style={styles.row}>
                  <Button
                    size="sm"
                    label="-"
                    onPress={() => onDecrement(line.menuItemId)}
                  />
                  <Button
                    size="sm"
                    label="+"
                    onPress={() => onIncrement(line.menuItemId)}
                    disabled={soldOutItemIds.includes(line.menuItemId)}
                  />
                </View>
              </View>
            ))}
          </View>
          <Divider />
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>Order Total</Text>
            <Heading>{formatMoney(calculateOrderTotal(order))}</Heading>
          </View>
        </>
      )}

      <View style={styles.row}>
        <Button
          label="Pay cash"
          variant="primary"
          onPress={() => onPay('cash')}
          disabled={empty}
        />
        <Button
          label="Pay online"
          onPress={() => onPay('online')}
          disabled={empty}
        />
        <Button
          label="Cancel order"
          variant="danger"
          onPress={onCancel}
          disabled={!order}
        />
      </View>
    </View>
  );
}
