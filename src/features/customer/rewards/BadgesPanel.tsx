import { Text, View } from 'react-native';
import { styles } from '@/components/ui';
import type { VisitSnapshot } from '../shared/visit';
import {
  STREAK_MIN_MINUTES,
  computeBadges,
  computeStreak,
} from './badgesModel';

const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

/** `visits` = the visits of one venue, oldest first. Works for guests too:
 * the history is local to this device either way. */
export function BadgesPanel({ visits }: { visits: VisitSnapshot[] }) {
  const badges = computeBadges(visits);
  const streak = computeStreak(visits);
  const earned = badges.filter((badge) => badge.earned).length;
  return (
    <View style={{ gap: 6 }}>
      <Text style={sectionTitle}>Badges</Text>
      <Text style={styles.text}>
        {earned} of {badges.length} earned. Badges are just for fun: they have
        no cash value.
      </Text>
      <Text style={styles.text}>
        Streak: {streak.current} visit{streak.current === 1 ? '' : 's'} in a row
        (best {streak.best}). A streak counts consecutive recorded visits of{' '}
        {STREAK_MIN_MINUTES} minutes or more, in the order you finished them,
        not calendar days.
      </Text>
      {badges.map((badge) => (
        <View
          key={badge.id}
          accessible
          accessibilityLabel={`${badge.name}, ${badge.earned ? 'earned' : 'locked'}, ${badge.progressText}`}
          style={{ gap: 2 }}
        >
          <Text style={{ fontWeight: '600' }}>
            {badge.earned ? '✓ Earned' : 'Locked'} · {badge.name}
          </Text>
          <Text style={styles.text}>
            {badge.description} ({badge.progressText})
          </Text>
        </View>
      ))}
    </View>
  );
}
