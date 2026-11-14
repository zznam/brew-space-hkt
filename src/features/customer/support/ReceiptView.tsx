import { Text, View } from 'react-native';
import { formatMoney } from '@/core';
import { Card, Heading, colors, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import type { VisitSnapshot } from '../shared/visit';
import { supportMessages } from './messages';
import { seatLabelText } from './supportModel';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={styles.text}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export function ReceiptView({ receipt }: { receipt: VisitSnapshot }) {
  const { t, lang } = useT(supportMessages);
  const seatKind =
    lang === 'vi' ? t(`kind.${receipt.seatKind}`) : receipt.seatKind;
  return (
    <Card>
      <Heading>{t('receiptHeading')}</Heading>
      <Text style={styles.text}>
        {receipt.venueName} · {seatLabelText(receipt.seatLabel, lang)} (
        {seatKind})
      </Text>
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
      <Line label={t('receiptTotal')} value={formatMoney(receipt.total)} />
      <Text style={styles.text}>{t('receiptDemo')}</Text>
    </Card>
  );
}
