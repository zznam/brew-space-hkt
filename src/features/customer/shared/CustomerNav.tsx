import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, colors, useResponsive } from '@/components/ui';
import { defineMessages } from '../i18n/i18n';
import { LanguageToggle } from '../i18n/LanguageToggle';
import { useT } from '../i18n/useLanguage';

export type CustomerTab = 'explore' | 'session' | 'member' | 'assistant';
const TABS: { key: CustomerTab; href: string }[] = [
  { key: 'explore', href: '/customer/explore' },
  { key: 'session', href: '/customer/active-session' },
  { key: 'member', href: '/customer/profile' },
  { key: 'assistant', href: '/customer/assistant' },
];
const messages = defineMessages<CustomerTab>(
  {
    explore: 'Explore',
    session: 'My session',
    member: 'Member',
    assistant: 'Assistant',
  },
  {
    explore: 'Khám phá',
    session: 'Phiên của tôi',
    member: 'Thành viên',
    assistant: 'Trợ lý',
  },
);

/** Navigation row shared by customer screens; `current` is shown as selected. */
export function CustomerNav({ current }: { current: CustomerTab }) {
  const { t } = useT(messages);
  const { isWide } = useResponsive();
  return (
    <View
      style={{
        gap: 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isWide ? 'center' : 'stretch',
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: 6,
          }}
        >
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              label={t(tab.key)}
              selected={tab.key === current}
              style={
                isWide
                  ? undefined
                  : { flex: 1, paddingHorizontal: 6, minWidth: 0 }
              }
              onPress={() => {
                if (tab.key !== current) router.replace(tab.href as never);
              }}
            />
          ))}
        </View>
        <View style={{ alignSelf: isWide ? 'auto' : 'flex-end' }}>
          <LanguageToggle />
        </View>
      </View>
    </View>
  );
}
