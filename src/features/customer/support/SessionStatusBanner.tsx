import { Text, View } from 'react-native';
import type { Session } from '@/core';
import { colors, radius, space, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import { supportMessages } from './messages';
import { timeStatus } from './supportModel';

const TONE = {
  ok: { background: colors.surfaceSubtle, border: colors.border },
  ending_soon: { background: colors.amberSurface, border: colors.amberBorder },
  grace: { background: colors.amberSurface, border: colors.amber },
  overtime: { background: colors.dangerSurface, border: colors.danger },
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
        borderRadius: radius.md,
        padding: space.md,
        gap: space.xs,
      }}
    >
      <Text style={styles.textStrong}>
        {status.kind === 'metered'
          ? t('banner.metered')
          : t(`banner.${status.state}`)}
      </Text>
      <Text style={[styles.text, { color: colors.ink }]}>{status.message}</Text>
    </View>
  );
}
