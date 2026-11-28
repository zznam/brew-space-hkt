import { catalogueMenu, posCatalogueMenu } from '@/core/catalogue/store';
import { useCatalogue } from '@/core/catalogue/useCatalogue';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Banner,
  Button,
  Card,
  colors,
  Eyebrow,
  Heading,
  Screen,
  ScreenHeader,
  space,
  styles,
  useResponsive,
} from '@/components/ui';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { merchantMessages, posErrorText } from '../messages';
import { MenuGrid } from './MenuGrid';
import { CartPanel } from './CartPanel';
import { calculateOrderTotal } from './posStore';
import { posStore, usePosStore } from './usePosStore';

export function PosScreen() {
  const { seatId: routeSeatId } = useLocalSearchParams<{ seatId?: string }>();
  const selectedSeatId = routeSeatId ?? null;
  const { isWide } = useResponsive();
  const { t, lang } = useT(merchantMessages);
  const venueId = useAppStore((state) => state.venueId);
  const orders = usePosStore((state) => state.orders);
  const pinnedItemIds = usePosStore((state) => state.pinnedItemIds);
  const catalogueItems = useCatalogue((state) => state.items);
  const [justPaid, setJustPaid] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const baseVenue = getVenue(venueId);
  const menu = posCatalogueMenu({ items: catalogueItems }, baseVenue);
  const venue = { ...baseVenue, menu };
  const available = new Set(
    catalogueMenu({ items: catalogueItems }, baseVenue).map((item) => item.id),
  );
  const soldOutItemIds = [
    ...menu.filter((item) => item.soldOut).map((item) => item.id),
    ...orders.flatMap((order) =>
      order.venueId === venueId
        ? order.lines
            .filter((line) => !available.has(line.menuItemId))
            .map((line) => line.menuItemId)
        : [],
    ),
  ];

  const draftOrder = orders.find(
    (order) =>
      order.venueId === venueId &&
      order.seatId === selectedSeatId &&
      order.status === 'draft',
  );

  useEffect(() => {
    const current = posStore
      .getState()
      .orders.find(
        (order) =>
          order.venueId === venueId &&
          order.seatId === selectedSeatId &&
          order.status === 'draft',
      );
    if (!current) posStore.getState().createOrder(venueId, selectedSeatId);
  }, [venueId, selectedSeatId]);

  const rawSeatLabel = selectedSeatId
    ? venue.seats.find((seat) => seat.id === selectedSeatId)?.label
    : null;
  const seatLabel = rawSeatLabel ? seatLabelText(rawSeatLabel, lang) : null;

  if (justPaid) {
    return (
      <Screen>
        <Card variant="accent">
          <Eyebrow color={colors.green}>{t('paidOverline')}</Eyebrow>
          <Heading>{t('paidTitle')}</Heading>
          <Text style={styles.text}>
            {t('paidBody', { venue: venue.name })}
          </Text>
          <View style={{ gap: space.sm }}>
            <Button
              label={t('newOrder')}
              variant="primary"
              fullWidth={!isWide}
              onPress={() => {
                posStore.getState().createOrder(venueId, selectedSeatId);
                setJustPaid(false);
              }}
            />
            <Button
              label={t('openTickets')}
              variant="ghost"
              onPress={() => router.push('/merchant/tickets')}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  const otherOpenOrders = orders.filter(
    (order) =>
      order.venueId === venueId &&
      order.id !== draftOrder?.id &&
      (order.status === 'draft' || order.status === 'awaiting_payment'),
  );

  return (
    <Screen>
      <ScreenHeader
        overline={t('posOverline')}
        accentColor={venue.accent}
        title={seatLabel ? t('sellTo', { seat: seatLabel }) : t('walkInOrder')}
        trailing={
          <Badge
            label={seatLabel ? t('target', { seat: seatLabel }) : t('walkIn')}
            tone={seatLabel ? 'info' : 'neutral'}
          />
        }
      />

      {actionError ? (
        <Banner tone="danger" role="alert">
          {actionError}
        </Banner>
      ) : null}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          alignItems: 'flex-start',
          gap: space.lg,
        }}
      >
        <Card style={isWide ? { flex: 1.4 } : undefined}>
          <Text style={styles.sectionLabel}>{t('menu')}</Text>

          <MenuGrid
            venue={venue}
            soldOutItemIds={soldOutItemIds}
            pinnedItemIds={pinnedItemIds}
            onTogglePinned={(itemId) =>
              posStore.getState().togglePinned(itemId)
            }
            onAdd={(item) => {
              if (!draftOrder) return;
              const result = posStore
                .getState()
                .addLine(draftOrder.id, item.id, item.name, item.price);
              setActionError(
                result.ok ? null : posErrorText(result.message, lang),
              );
            }}
            onToggleSoldOut={(itemId) =>
              posStore.getState().toggleSoldOut(itemId)
            }
          />
        </Card>

        <Card style={isWide ? { flex: 1 } : undefined}>
          <CartPanel
            order={draftOrder ?? null}
            soldOutItemIds={soldOutItemIds}
            onIncrement={(itemId) => {
              if (!draftOrder) return;
              const item = venue.menu.find((entry) => entry.id === itemId);
              if (!item) return;
              const result = posStore
                .getState()
                .addLine(draftOrder.id, item.id, item.name, item.price);
              setActionError(
                result.ok ? null : posErrorText(result.message, lang),
              );
            }}
            onDecrement={(itemId) => {
              if (!draftOrder) return;
              const line = draftOrder.lines.find(
                (entry) => entry.menuItemId === itemId,
              );
              if (!line) return;
              const result = posStore
                .getState()
                .setLineQuantity(draftOrder.id, itemId, line.quantity - 1);
              setActionError(
                result.ok ? null : posErrorText(result.message, lang),
              );
            }}
            onPay={(method) => {
              if (!draftOrder) return;
              const result = posStore.getState().pay(draftOrder.id, method);
              if (result.ok) setJustPaid(true);
              else setActionError(posErrorText(result.message, lang));
            }}
            onCancel={() => {
              if (!draftOrder) return;
              const result = posStore.getState().cancelOrder(draftOrder.id);
              if (result.ok) {
                setActionError(null);
                posStore.getState().createOrder(venueId, selectedSeatId);
              } else {
                setActionError(posErrorText(result.message, lang));
              }
            }}
          />
        </Card>
      </View>

      {otherOpenOrders.length > 0 ? (
        <Card>
          <View style={styles.rowBetween}>
            <Heading level={2}>{t('otherOrders')}</Heading>
            <Badge label={`${otherOpenOrders.length}`} tone="neutral" />
          </View>
          {otherOpenOrders.map((order) => (
            <View key={order.id} style={styles.inset}>
              <Text style={styles.textStrong}>
                {order.seatId
                  ? seatLabelText(
                      venue.seats.find((seat) => seat.id === order.seatId)
                        ?.label ?? '',
                      lang,
                    )
                  : t('walkIn')}{' '}
                · {formatMoney(calculateOrderTotal(order))}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
