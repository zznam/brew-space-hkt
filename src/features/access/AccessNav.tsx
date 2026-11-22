import { router } from 'expo-router';
import { TabBar } from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { accessMessages } from './messages';
import { useIdentity } from './shared';

export function AccessNav({ pathname }: { pathname: string }) {
  const identity = useIdentity();
  const { t } = useT(accessMessages);
  if (
    identity?.kind !== 'staff' ||
    !(pathname.startsWith('/staff') || pathname.startsWith('/v/'))
  )
    return null;
  return (
    <TabBar
      current={
        pathname.startsWith('/v/')
          ? null
          : pathname === '/staff/team'
            ? 'team'
            : pathname === '/staff/catalogue'
              ? 'menu'
              : pathname === '/staff/orders'
                ? 'orders'
                : pathname === '/staff/tickets'
                  ? 'tickets'
                  : 'venue'
      }
      items={[
        { key: 'venue', label: t('venue'), icon: 'floor' },
        { key: 'menu', label: t('menu'), icon: 'order' },
        { key: 'orders', label: t('orders'), icon: 'order' },
        { key: 'tickets', label: t('tickets'), icon: 'tickets' },
        { key: 'team', label: t('team'), icon: 'member' },
      ]}
      onSelect={(key) =>
        router.push(
          (key === 'team'
            ? '/staff/team'
            : key === 'menu'
              ? '/staff/catalogue'
              : key === 'orders'
                ? '/staff/orders'
                : key === 'tickets'
                  ? '/staff/tickets'
                  : '/staff') as never,
        )
      }
    />
  );
}
