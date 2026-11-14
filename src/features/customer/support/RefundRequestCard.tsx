import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { formatMoney } from '@/core';
import { Badge, Button, Card, colors, Heading, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import type { VisitSnapshot } from '../shared/visit';
import { supportMessages } from './messages';
import {
  MAX_REFUND_REASON,
  latestRefundForSession,
  openRefundForSession,
  refundNotice,
  refundStatusLabel,
} from './refundModel';
import { failureText } from './supportModel';
import { useSupport } from './useSupport';

/** Refund request for one finished visit. It only asks a manager to review:
 * no money moves and the screen never says "refunded". */
export function RefundRequestCard({ receipt }: { receipt: VisitSnapshot }) {
  const { t, lang } = useT(supportMessages);
  const refunds = useSupport((state) => state.refunds);
  const requestRefund = useSupport((state) => state.requestRefund);
  const withdrawRefund = useSupport((state) => state.withdrawRefund);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();

  const open = openRefundForSession(refunds, receipt.sessionId);
  const latest = latestRefundForSession(refunds, receipt.sessionId);

  return (
    <Card>
      <View style={styles.rowBetween}>
        <Heading style={{ fontSize: 22 }}>{t('refundHeading')}</Heading>
        {latest ? (
          <Badge
            label={latest.status === 'requested' ? 'In Review' : 'Closed'}
            tone={latest.status === 'requested' ? 'warning' : 'neutral'}
          />
        ) : null}
      </View>

      <Text style={styles.text}>{refundNotice(lang)}</Text>

      {latest ? (
        <Card variant="subtle" style={{ gap: 6 }}>
          <Text style={{ color: colors.ink, fontWeight: '700' }}>
            {t('status', { status: refundStatusLabel(latest.status, lang) })}
          </Text>
          <Text style={styles.text}>
            {t('refundSummary', {
              amount: formatMoney(latest.amount),
              reason: latest.reason,
            })}
          </Text>
        </Card>
      ) : null}

      {open ? (
        <View style={styles.row}>
          <Button
            label={t('withdraw')}
            onPress={() => {
              const result = withdrawRefund(open.id);
              setFeedback(
                result.ok
                  ? { ok: true, text: t('withdrawn') }
                  : { ok: false, text: failureText(result, lang) },
              );
            }}
          />
        </View>
      ) : (
        <>
          <TextInput
            accessibilityLabel={t('refundReasonLabel')}
            multiline
            maxLength={MAX_REFUND_REASON + 50}
            value={reason}
            onChangeText={setReason}
            placeholder={t('refundReasonPlaceholder')}
            style={[styles.input, { minHeight: 72 }]}
          />
          <View style={styles.rowBetween}>
            <Text
              style={{
                fontSize: 13,
                color:
                  reason.length > MAX_REFUND_REASON
                    ? colors.danger
                    : colors.muted,
              }}
            >
              {t('characters', { n: reason.length, max: MAX_REFUND_REASON })}
            </Text>
            <Button
              label={t('requestRefund')}
              disabled={!reason.trim() || reason.length > MAX_REFUND_REASON}
              onPress={() => {
                const result = requestRefund(receipt, reason);
                if (result.ok) setReason('');
                setFeedback(
                  result.ok
                    ? { ok: true, text: t('refundSent') }
                    : { ok: false, text: failureText(result, lang) },
                );
              }}
            />
          </View>
        </>
      )}

      {feedback ? (
        <Text
          accessibilityRole="alert"
          style={{
            color: feedback.ok ? colors.green : colors.danger,
            fontWeight: '700',
          }}
        >
          {feedback.text}
        </Text>
      ) : null}
    </Card>
  );
}
