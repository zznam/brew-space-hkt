import { Text, View } from 'react-native';
import { styles } from '@/components/ui';
import { useT } from '../i18n/useLanguage';
import type { VisitSnapshot } from '../shared/visit';
import {
  STREAK_MIN_MINUTES,
  computeBadges,
  computeStreak,
} from './badgesModel';
import { badgesMessages } from './messages';

const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

/** `visits` = the visits of one venue, oldest first. Works for guests too:
 * the history is local to this device either way. */
export function BadgesPanel({ visits }: { visits: VisitSnapshot[] }) {
  const { t, lang } = useT(badgesMessages);
  const badges = computeBadges(visits, lang);
  const streak = computeStreak(visits);
  const earned = badges.filter((badge) => badge.earned).length;
  return (
    <View style={{ gap: 6 }}>
      <Text style={sectionTitle}>{t('title')}</Text>
      <Text style={styles.text}>
        {t('summary', { earned, total: badges.length })}
      </Text>
      <Text style={styles.text}>
        {t('streak', {
          current: streak.current,
          unit: streak.current === 1 ? t('streakOne') : t('streakMany'),
          best: streak.best,
          min: STREAK_MIN_MINUTES,
        })}
      </Text>
      {badges.map((badge) => (
        <View
          key={badge.id}
          accessible
          accessibilityLabel={`${badge.name}, ${badge.earned ? t('earned') : t('locked')}, ${badge.progressText}`}
          style={{ gap: 2 }}
        >
          <Text style={{ fontWeight: '600' }}>
            {badge.earned ? t('earnedLabel') : t('lockedLabel')} · {badge.name}
          </Text>
          <Text style={styles.text}>
            {badge.description} ({badge.progressText})
          </Text>
        </View>
      ))}
    </View>
  );
}
