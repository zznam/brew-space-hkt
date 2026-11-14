import { Text, View } from 'react-native';
import type { Session } from '@/core';
import { colors } from '@/components/ui';
import { timeStatus } from './supportModel';

const TONE = {
  ok: { background: '#eef1e9', border: colors.border, title: 'On track' },
  ending_soon: {
    background: '#fff4d6',
    border: '#d9b44a',
    title: 'Time is almost up',
  },
  grace: {
    background: '#ffe9cf',
    border: '#d98a2b',
    title: 'Grace period',
  },
  overtime: {
    background: '#fde2e0',
    border: '#c0564f',
    title: 'Overtime',
  },
} as const;

/** Informational only: it never ends a session or charges anything itself;
 * billing comes from the core billing policy. */
export function SessionStatusBanner({
  session,
}: {
  session: Pick<Session, 'mode' | 'elapsedMinutes'>;
}) {
  const status = timeStatus(session);
  const tone = TONE[status.state];
  const urgent = status.state !== 'ok';
  return (
    <View
      accessibilityRole={urgent ? 'alert' : undefined}
      style={{
        backgroundColor: tone.background,
        borderColor: tone.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ color: colors.ink, fontWeight: '700' }}>
        {status.kind === 'metered' ? 'Pay-as-you-go time' : tone.title}
      </Text>
      <Text style={{ color: colors.ink, lineHeight: 22 }}>
        {status.message}
      </Text>
    </View>
  );
}
