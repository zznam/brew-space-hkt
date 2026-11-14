import { Text, View } from 'react-native';
import { formatMoney } from '@/core';
import {
  Badge,
  Button,
  Divider,
  EmptyState,
  Heading,
  space,
  styles,
  useResponsive,
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
  const { isWide } = useResponsive();
  const empty = !order || order.lines.length === 0;
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.rowBetween}>
        <Text style={styles.subheading}>Order Cart</Text>
        {order ? (
          <Badge label={`${order.lines.length} line(s)`} tone="neutral" />
        ) : null}
      </View>

      {empty || !order ? (
        <EmptyState message="Cart is empty. Add an item to start." />
      ) : (
        <>
          <View style={{ gap: space.sm }}>
            {order.lines.map((line) => (
              <View
                key={line.menuItemId}
                style={[styles.inset, styles.insetRow]}
              >
                <Text style={[styles.textStrong, { flex: 1 }]}>
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

      <View style={{ gap: space.sm }}>
        <Button
          label="Pay cash"
          variant="primary"
          fullWidth={!isWide}
          onPress={() => onPay('cash')}
          disabled={empty}
        />
        <View style={styles.row}>
          <Button
            label="Pay online"
            style={isWide ? undefined : { flex: 1 }}
            onPress={() => onPay('online')}
            disabled={empty}
          />
          <Button
            label="Cancel order"
            variant="danger"
            style={isWide ? undefined : { flex: 1 }}
            onPress={onCancel}
            disabled={!order}
          />
        </View>
      </View>
    </View>
  );
}
