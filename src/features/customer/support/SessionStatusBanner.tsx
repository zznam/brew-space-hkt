import { Text, View } from 'react-native';
import type { Session } from '@/core';
import { colors } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages } from './messages';
import { timeStatus } from './supportModel';

const TONE = {
  ok: { background: '#eef1e9', border: colors.border },
  ending_soon: { background: '#fff4d6', border: '#d9b44a' },
  grace: { background: '#ffe9cf', border: '#d98a2b' },
  overtime: { background: '#fde2e0', border: '#c0564f' },
} as const;

/** Informational only: it never ends a session or charges anything itself;
 * billing comes from the core billing policy. */
export function SessionStatusBanner({
  session,
}: {
  session: Pick<Session, 'mode' | 'elapsedMinutes'>;
}) {
  const { t, lang } = useT(supportMessages);
  const status = timeStatus(session, lang);
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
        {status.kind === 'metered'
          ? t('banner.metered')
          : t(`banner.${status.state}`)}
      </Text>
      <Text style={{ color: colors.ink, lineHeight: 22 }}>
        {status.message}
      </Text>
    </View>
  );
}
