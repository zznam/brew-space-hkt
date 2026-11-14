import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { formatMoney } from '@/core';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
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
      <Heading>{t('refundHeading')}</Heading>
      <Text style={styles.text}>{refundNotice(lang)}</Text>
      {latest ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>
            {t('status', { status: refundStatusLabel(latest.status, lang) })}
          </Text>
          <Text style={styles.text}>
            {t('refundSummary', {
              amount: formatMoney(latest.amount),
              reason: latest.reason,
            })}
          </Text>
        </>
      ) : null}
      {open ? (
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
      ) : (
        <>
          <TextInput
            accessibilityLabel={t('refundReasonLabel')}
            multiline
            maxLength={MAX_REFUND_REASON + 50}
            value={reason}
            onChangeText={setReason}
            placeholder={t('refundReasonPlaceholder')}
            style={{
              minHeight: 72,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 12,
              color: colors.ink,
            }}
          />
          <Text
            style={{
              color: reason.length > MAX_REFUND_REASON ? '#a33' : colors.muted,
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
        </>
      )}
      {feedback ? (
        <Text
          accessibilityRole="alert"
          style={{ color: feedback.ok ? colors.green : '#a33' }}
        >
          {feedback.text}
        </Text>
      ) : null}
    </Card>
  );
}
