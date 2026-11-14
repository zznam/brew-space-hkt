import { Text, View } from 'react-native';
import { formatMoney, type BillingMode } from '@/core';
import { Card, Heading, colors, styles } from '@/components/ui';
import type { VisitSnapshot } from '../shared/visit';

const MODE_LABEL: Record<BillingMode, string> = {
  METERED_OPEN: 'Pay as you go',
  BUNDLE_2H: '2-hour bundle',
  BUNDLE_4H: '4-hour bundle',
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={styles.text}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export function ReceiptView({ receipt }: { receipt: VisitSnapshot }) {
  return (
    <Card>
      <Heading>Your receipt</Heading>
      <Text style={styles.text}>
        {receipt.venueName} · {receipt.seatLabel} ({receipt.seatKind})
      </Text>
      <Line label="Mode" value={MODE_LABEL[receipt.mode]} />
      <Line label="Time" value={`${receipt.minutes} minutes`} />
      <Line label="Seat time" value={formatMoney(receipt.time)} />
      {receipt.orders.length === 0 ? (
        <Text style={styles.text}>No items ordered.</Text>
      ) : (
        receipt.orders.map((order, index) => (
          <Line
            key={`${order.name}-${index}`}
            label={`${order.quantity} × ${order.name}`}
            value={formatMoney(order.unitPrice * order.quantity)}
          />
        ))
      )}
      <Line label="Total" value={formatMoney(receipt.total)} />
      <Text style={styles.text}>Demo receipt — no payment collected</Text>
    </Card>
  );
}
