import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { formatMoney } from '@/core';
import { Button, Card, Heading, colors, styles } from '@/components/ui';
import type { VisitSnapshot } from '../shared/visit';
import {
  MAX_REFUND_REASON,
  REFUND_NOTICE,
  REFUND_STATUS_LABEL,
  latestRefundForSession,
  openRefundForSession,
} from './refundModel';
import { useSupport } from './useSupport';

/** Refund request for one finished visit. It only asks a manager to review:
 * no money moves and the screen never says "refunded". */
export function RefundRequestCard({ receipt }: { receipt: VisitSnapshot }) {
  const refunds = useSupport((state) => state.refunds);
  const requestRefund = useSupport((state) => state.requestRefund);
  const withdrawRefund = useSupport((state) => state.withdrawRefund);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string }>();

  const open = openRefundForSession(refunds, receipt.sessionId);
  const latest = latestRefundForSession(refunds, receipt.sessionId);

  return (
    <Card>
      <Heading>Refund request</Heading>
      <Text style={styles.text}>{REFUND_NOTICE}</Text>
      {latest ? (
        <>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>
            Status: {REFUND_STATUS_LABEL[latest.status]}
          </Text>
          <Text style={styles.text}>
            Visit total {formatMoney(latest.amount)} · Your reason:{' '}
            {latest.reason}
          </Text>
        </>
      ) : null}
      {open ? (
        <Button
          label="Withdraw request"
          onPress={() => {
            const result = withdrawRefund(open.id);
            setFeedback(
              result.ok
                ? { ok: true, text: 'Your request was withdrawn.' }
                : { ok: false, text: result.message },
            );
          }}
        />
      ) : (
        <>
          <TextInput
            accessibilityLabel="Reason for your refund request"
            multiline
            maxLength={MAX_REFUND_REASON + 50}
            value={reason}
            onChangeText={setReason}
            placeholder="Why are you asking for a refund?"
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
            {reason.length}/{MAX_REFUND_REASON} characters
          </Text>
          <Button
            label="Request a refund"
            disabled={!reason.trim() || reason.length > MAX_REFUND_REASON}
            onPress={() => {
              const result = requestRefund(receipt, reason);
              if (result.ok) setReason('');
              setFeedback(
                result.ok
                  ? {
                      ok: true,
                      text: 'Request sent. A manager will review it. Nothing is paid back in this demo.',
                    }
                  : { ok: false, text: result.message },
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
