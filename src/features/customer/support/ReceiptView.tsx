import { Text, View } from 'react-native';
import { formatMoney } from '@/core';
import { Badge, Card, Divider, Heading, styles, space } from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
import type { VisitSnapshot } from '../shared/visit';
import { supportMessages } from './messages';
import { seatLabelText } from './supportModel';

function Line({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: space.xs,
      }}
    >
      <Text style={bold ? styles.textStrong : styles.text}>{label}</Text>
      <Text
        style={[
          bold ? styles.subheading : styles.textStrong,
          { fontVariant: ['tabular-nums'] },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function ReceiptView({ receipt }: { receipt: VisitSnapshot }) {
  const { t, lang } = useT(supportMessages);
  const seatKind =
    lang === 'vi' ? t(`kind.${receipt.seatKind}`) : receipt.seatKind;
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading>{t('receiptHeading')}</Heading>
        <Badge label={t('completedVisit')} tone="success" />
      </View>

      <Text style={styles.textStrong}>
        {receipt.venueName} · {seatLabelText(receipt.seatLabel, lang)} (
        {seatKind})
      </Text>

      <Divider />

      <Line label={t('receiptMode')} value={t(`mode.${receipt.mode}`)} />
      <Line
        label={t('receiptTime')}
        value={t('receiptMinutes', { n: receipt.minutes })}
      />
      <Line label={t('receiptSeatTime')} value={formatMoney(receipt.time)} />

      {receipt.orders.length === 0 ? (
        <Text style={styles.text}>{t('receiptNoItems')}</Text>
      ) : (
        receipt.orders.map((order, index) => (
          <Line
            key={`${order.name}-${index}`}
            label={`${order.quantity} × ${order.name}`}
            value={formatMoney(order.unitPrice * order.quantity)}
          />
        ))
      )}

      <Divider />

      <Line label={t('receiptTotal')} value={formatMoney(receipt.total)} bold />
      <Text style={styles.caption}>{t('receiptDemo')}</Text>
    </Card>
  );
}
