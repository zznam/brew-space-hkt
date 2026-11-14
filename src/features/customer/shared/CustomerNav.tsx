import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, styles } from '@/components/ui';

export type CustomerTab = 'explore' | 'session' | 'member' | 'assistant';
const TABS: { key: CustomerTab; label: string; href: string }[] = [
  { key: 'explore', label: 'Explore', href: '/customer/explore' },
  { key: 'session', label: 'My session', href: '/customer/active-session' },
  { key: 'member', label: 'Member', href: '/customer/profile' },
  { key: 'assistant', label: 'Assistant', href: '/customer/assistant' },
];

/** Navigation row shared by customer screens; `current` is shown as selected. */
export function CustomerNav({ current }: { current: CustomerTab }) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => (
        <Button
          key={tab.key}
          label={tab.label}
          selected={tab.key === current}
          onPress={() => {
            if (tab.key !== current) router.replace(tab.href as never);
          }}
        />
      ))}
    </View>
  );
}
