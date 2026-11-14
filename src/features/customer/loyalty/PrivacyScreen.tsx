import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Heading, styles } from '@/components/ui';
import { CustomerNav } from '../shared/CustomerNav';

const sectionTitle = { fontWeight: '700', fontSize: 17 } as const;

const SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: 'Stored on this device only',
    lines: [
      'Everything below stays on this device. This demo has no server, no account system and no analytics, so nothing here is uploaded anywhere.',
    ],
  },
  {
    title: '1. Demo session (key vibing-hkt:demo:v1)',
    lines: [
      'Seats, sessions, orders on your tab, the selected venue and role. It is demo data, not a real booking or payment.',
      'Cleared by "Reset all demo data" in the simulator bar.',
    ],
  },
  {
    title: '2. Member data (key vibing-hkt:customer:v1)',
    lines: [
      'Only after you join, plus visit history for guests: your mobile number, your consent, visit history (seat, minutes, items, total), points history, drink preferences including the allergy note, pinned seats, and a referral bonus if you used a friend code.',
      'Badges, streaks and your referral code are worked out from this data when you open the page. They are not stored separately.',
      'There is no automatic expiry: data stays until you delete it or clear this site or app data.',
    ],
  },
  {
    title: '3. Memory only (lost on reload)',
    lines: [
      'Your cart and order log, support requests, the last receipt and ratings, and the focus timer. They are never written to storage.',
    ],
  },
  {
    title: 'Sent to AI',
    lines: [
      'Nothing today. No AI feature exists in this app. If one is added later, this page will say what it would send and ask for your consent first.',
    ],
  },
  {
    title: 'Demo notes',
    lines: [
      'The verification code is shown on screen and no SMS is sent. A friend code is checked only for its format, venue and that it is not your own: the friend is not credited, because there is only this device.',
    ],
  },
];

export function PrivacyScreen() {
  return (
    <Card>
      <CustomerNav current="member" />
      <Heading>How we use your data</Heading>
      <Text style={styles.text}>
        What is stored, how long it is kept, what is sent to AI, and how to
        delete it. You can read this before joining.
      </Text>
      {SECTIONS.map((section) => (
        <View key={section.title} style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={sectionTitle}>
            {section.title}
          </Text>
          {section.lines.map((line) => (
            <Text key={line} style={styles.text}>
              {line}
            </Text>
          ))}
        </View>
      ))}
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={sectionTitle}>
          How to delete your data
        </Text>
        <Text style={styles.text}>
          On the Member page, use &ldquo;Leave programme and delete my
          data&rdquo; (members) or &ldquo;Delete my visit data&rdquo; (guests).
          This removes that venue&apos;s number, visits, points, preferences and
          pinned seats at once.
        </Text>
        <View style={styles.row}>
          <Button
            label="Go to Member page"
            onPress={() => router.replace('/customer/profile' as never)}
          />
        </View>
      </View>
    </Card>
  );
}
