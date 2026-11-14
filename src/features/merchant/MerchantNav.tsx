import { router } from 'expo-router';
import { TabBar, type TabItem } from '@/components/ui';

export type MerchantTab = 'live-floor' | 'pos' | 'tickets' | 'onboarding';

const TABS: (TabItem<MerchantTab> & { href: string })[] = [
  {
    key: 'live-floor',
    label: 'Floor',
    accessibilityLabel: 'Live Floor',
    icon: 'floor',
    href: '/merchant/live-floor',
  },
  { key: 'pos', label: 'New order', icon: 'order', href: '/merchant/pos' },
  {
    key: 'tickets',
    label: 'Tickets',
    icon: 'tickets',
    href: '/merchant/tickets',
  },
  {
    key: 'onboarding',
    label: '3D Studio',
    accessibilityLabel: 'Onboard Cafe / 3D Studio',
    icon: 'studio',
    href: '/merchant/onboarding',
  },
];

export function merchantTabForPath(pathname: string): MerchantTab | null {
  return TABS.find((tab) => pathname.startsWith(tab.href))?.key ?? null;
}

/** Bottom tab bar for the merchant role, rendered once by the root layout. */
export function MerchantNav({ current }: { current: MerchantTab | null }) {
  return (
    <TabBar
      items={TABS}
      current={current}
      onSelect={(key) => {
        const tab = TABS.find((entry) => entry.key === key);
        if (tab && key !== current) router.push(tab.href as never);
      }}
    />
  );
}
