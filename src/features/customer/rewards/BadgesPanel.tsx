import { Text, View } from 'react-native';
import { Badge, Card, colors, styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import type { VisitSnapshot } from '../shared/visit';
import {
  STREAK_MIN_MINUTES,
  computeBadges,
  computeStreak,
} from './badgesModel';
import { badgesMessages } from './messages';

/** `visits` = the visits of one venue, oldest first. Works for guests too:
 * the history is local to this device either way. */
export function BadgesPanel({ visits }: { visits: VisitSnapshot[] }) {
  const { t, lang } = useT(badgesMessages);
  const badges = computeBadges(visits, lang);
  const streak = computeStreak(visits);
  const earned = badges.filter((badge) => badge.earned).length;
  return (
    <Card variant="subtle" style={{ gap: 10 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.subheading}>{t('title')}</Text>
        <Badge
          label={t('summary', { earned, total: badges.length })}
          tone={earned > 0 ? 'success' : 'neutral'}
        />
      </View>

      <Text style={styles.text}>
        {t('streak', {
          current: streak.current,
          unit: streak.current === 1 ? t('streakOne') : t('streakMany'),
          best: streak.best,
          min: STREAK_MIN_MINUTES,
        })}
      </Text>

      <View style={styles.grid}>
        {badges.map((badge) => (
          <View
            key={badge.id}
            accessible
            accessibilityLabel={`${badge.name}, ${badge.earned ? t('earned') : t('locked')}, ${badge.progressText}`}
            style={{
              flex: 1,
              minWidth: 200,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: badge.earned ? colors.greenBorder : colors.border,
              backgroundColor: badge.earned
                ? colors.greenSurface
                : colors.surface,
              gap: 4,
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                color: badge.earned ? colors.green : colors.ink,
              }}
            >
              {badge.earned ? t('earnedLabel') : t('lockedLabel')} ·{' '}
              {badge.name}
            </Text>
            <Text style={[styles.text, { fontSize: 13 }]}>
              {badge.description} ({badge.progressText})
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
