import { router } from 'expo-router';
import { TabBar, type TabItem } from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { merchantMessages } from './messages';

export type MerchantTab =
  'live-floor' | 'pos' | 'tickets' | 'onboarding' | 'catalogue';

type Key = keyof typeof merchantMessages.en;
const TABS: {
  key: MerchantTab;
  label: Key;
  accessibilityLabel?: Key;
  icon: TabItem<MerchantTab>['icon'];
  href: string;
}[] = [
  {
    key: 'live-floor',
    label: 'tabFloor',
    accessibilityLabel: 'tabFloorA11y',
    icon: 'floor',
    href: '/merchant/live-floor',
  },
  {
    key: 'catalogue',
    label: 'tabMenu',
    accessibilityLabel: 'tabMenuA11y',
    icon: 'order',
    href: '/merchant/catalogue',
  },
  { key: 'pos', label: 'tabOrder', icon: 'order', href: '/merchant/pos' },
  {
    key: 'tickets',
    label: 'tabTickets',
    icon: 'tickets',
    href: '/merchant/tickets',
  },
  {
    key: 'onboarding',
    label: 'tabStudio',
    accessibilityLabel: 'tabStudioA11y',
    icon: 'studio',
    href: '/merchant/onboarding',
  },
];

export function merchantTabForPath(pathname: string): MerchantTab | null {
  return TABS.find((tab) => pathname.startsWith(tab.href))?.key ?? null;
}

/** Bottom tab bar for the merchant role, rendered once by the root layout. */
export function MerchantNav({ current }: { current: MerchantTab | null }) {
  const { t } = useT(merchantMessages);
  return (
    <TabBar
      items={TABS.map((tab) => ({
        key: tab.key,
        icon: tab.icon,
        label: t(tab.label),
        accessibilityLabel: tab.accessibilityLabel
          ? t(tab.accessibilityLabel)
          : undefined,
      }))}
      current={current}
      onSelect={(key) => {
        const tab = TABS.find((entry) => entry.key === key);
        if (tab && key !== current) router.push(tab.href as never);
      }}
    />
  );
}
