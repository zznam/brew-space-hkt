import { router } from 'expo-router';
import { TabBar, type TabItem } from '@/components/ui';
import { defineMessages } from '../../../i18n/i18n';
import { useT } from '../../../i18n/useLanguage';

export type CustomerTab = 'explore' | 'session' | 'member' | 'assistant';
const TABS: {
  key: CustomerTab;
  href: string;
  icon: TabItem<string>['icon'];
}[] = [
  { key: 'explore', href: '/customer/explore', icon: 'explore' },
  { key: 'session', href: '/customer/active-session', icon: 'session' },
  { key: 'member', href: '/customer/profile', icon: 'member' },
  { key: 'assistant', href: '/customer/assistant', icon: 'assistant' },
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

/** Which customer tab owns a route; detail routes belong to their parent. */
export function customerTabForPath(pathname: string): CustomerTab | null {
  if (pathname.startsWith('/customer/explore')) return 'explore';
  if (
    pathname.startsWith('/customer/active-session') ||
    pathname.startsWith('/customer/receipt')
  )
    return 'session';
  if (
    pathname.startsWith('/customer/profile') ||
    pathname.startsWith('/customer/privacy')
  )
    return 'member';
  if (pathname.startsWith('/customer/assistant')) return 'assistant';
  return null;
}

/** Bottom tab bar for the customer role, rendered once by the root layout. */
export function CustomerNav({ current }: { current: CustomerTab | null }) {
  const { t } = useT(messages);
  return (
    <TabBar
      items={TABS.map((tab) => ({
        key: tab.key,
        label: t(tab.key),
        icon: tab.icon,
      }))}
      current={current}
      onSelect={(key) => {
        const tab = TABS.find((entry) => entry.key === key);
        if (tab && key !== current) router.replace(tab.href as never);
      }}
    />
  );
}
