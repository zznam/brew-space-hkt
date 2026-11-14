import { Text, View } from 'react-native';
import {
  Badge,
  Card,
  colors,
  radius,
  styles,
  useResponsive,
  space,
} from '@/components/ui';
import { useT } from '../../../i18n/useLanguage';
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
  const { isWide } = useResponsive();
  const badges = computeBadges(visits, lang);
  const streak = computeStreak(visits);
  const earned = badges.filter((badge) => badge.earned).length;
  return (
    <Card>
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

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          flexWrap: isWide ? 'wrap' : 'nowrap',
          gap: space.sm,
        }}
      >
        {badges.map((badge) => (
          <View
            key={badge.id}
            accessible
            accessibilityLabel={`${badge.name}, ${badge.earned ? t('earned') : t('locked')}, ${badge.progressText}`}
            style={{
              width: isWide ? 220 : '100%',
              maxWidth: '100%',
              flexGrow: isWide ? 1 : 0,
              padding: space.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: badge.earned ? colors.greenBorder : colors.border,
              backgroundColor: badge.earned
                ? colors.greenSurface
                : colors.surface,
              gap: space.xs,
            }}
          >
            <Text
              style={[
                styles.textStrong,
                badge.earned && { color: colors.green },
              ]}
            >
              {badge.earned ? t('earnedLabel') : t('lockedLabel')} ·{' '}
              {badge.name}
            </Text>
            <Text style={styles.caption}>
              {badge.description} ({badge.progressText})
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
