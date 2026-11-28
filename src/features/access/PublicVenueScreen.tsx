import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, View } from 'react-native';
import { getPublicVenue } from '@/api/client';
import {
  Banner,
  Chip,
  EmptyState,
  Screen,
  ScreenHeader,
  space,
  radius,
} from '@/components/ui';
import { useT } from '@/i18n/useLanguage';
import { accessMessages } from './messages';
import { RemoteState, useRemote } from './shared';
import { CustomerCheckout } from '@/features/purchase/CustomerCheckout';
import { useRefresh } from '@/features/purchase/shared';
import { clockOffset, formatCountdown, saleTimeLeft } from './saleCountdown';

type Sale = {
  id: string;
  name: string;
  discountPercent: number;
  endAt: number;
};

/** F279: live countdown per sale on the server clock; an ended sale disappears at once. */
function SaleBanners({
  sales,
  serverNow,
}: {
  sales: Sale[];
  serverNow: number;
}) {
  const { t } = useT(accessMessages);
  // The interval is the only place state changes; the latest server time is kept in a ref.
  const received = useRef({ serverNow, at: 0 });
  const [clock, setClock] = useState(() => ({
    deviceNow: Date.now(),
    offset: 0,
  }));
  useEffect(() => {
    received.current = { serverNow, at: Date.now() };
  }, [serverNow]);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const { serverNow: server, at } = received.current;
      setClock({ deviceNow: now, offset: at ? clockOffset(server, at) : 0 });
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const { deviceNow, offset } = clock;
  return (
    <>
      {sales.map((sale) => {
        const left = saleTimeLeft(sale.endAt, deviceNow, offset);
        return left > 0 ? (
          <Banner key={sale.id} tone="success">
            {t('saleEndsIn', {
              name: sale.name,
              percent: sale.discountPercent,
              time: formatCountdown(left),
            })}
          </Banner>
        ) : null;
      })}
    </>
  );
}

export default function PublicVenueScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const load = useCallback(() => getPublicVenue(slug ?? ''), [slug]);
  const remote = useRemote(load);
  useRefresh(remote.reload);
  const { t } = useT(accessMessages);
  const [category, setCategory] = useState<string | null>(null);
  const data = remote.data;
  if (remote.error === 'NOT_FOUND')
    return <EmptyState title={t('notFound')} message={t('notFoundBody')} />;
  return (
    <Screen
      style={
        data
          ? {
              backgroundColor: data.brand.background,
              padding: space.lg,
              borderRadius: radius.xl,
              borderTopWidth: space.xs,
              borderTopColor: data.brand.primary,
            }
          : undefined
      }
    >
      <ScreenHeader
        title={data?.brand.displayName ?? t('menu')}
        subtitle={data?.branch.address}
        accentColor={data?.brand.primary}
        textColor={data?.brand.text}
      />
      <RemoteState
        loading={remote.loading}
        error={remote.error}
        retry={remote.reload}
      />
      {data ? (
        <>
          {data.brand.logoUrl ? (
            <Image
              source={{ uri: data.brand.logoUrl }}
              accessibilityLabel={data.brand.displayName}
              style={{ width: 80, height: 80, maxWidth: '100%' }}
              resizeMode="contain"
            />
          ) : null}
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}
          >
            <Chip
              label={t('all')}
              selected={category === null}
              onPress={() => setCategory(null)}
            />
            {data.categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </View>
          <SaleBanners sales={data.sales} serverNow={data.serverNow} />
          {!data.items.length ? (
            <EmptyState title={t('emptyMenu')} message={t('emptyMenuBody')} />
          ) : null}
          <CustomerCheckout
            key={data.branch.id}
            menu={data}
            category={category}
          />
        </>
      ) : null}
    </Screen>
  );
}
