import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, colors, Eyebrow, styles } from '@/components/ui';

export type MerchantTab = 'live-floor' | 'pos' | 'tickets' | 'onboarding';

const TABS: { key: MerchantTab; label: string; href: string }[] = [
  { key: 'live-floor', label: 'Live Floor', href: '/merchant/live-floor' },
  { key: 'pos', label: 'New order', href: '/merchant/pos' },
  { key: 'tickets', label: 'Tickets', href: '/merchant/tickets' },
  {
    key: 'onboarding',
    label: 'Onboard Cafe / 3D Studio',
    href: '/merchant/onboarding',
  },
];

export function MerchantNav({ current }: { current: MerchantTab }) {
  return (
    <Card
      variant="subtle"
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
      }}
    >
      <View style={styles.rowBetween}>
        <Eyebrow>MERCHANT OPERATIONS</Eyebrow>
        <View style={styles.row}>
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              label={tab.label}
              selected={tab.key === current}
              onPress={() => {
                if (tab.key !== current) router.push(tab.href as never);
              }}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}
