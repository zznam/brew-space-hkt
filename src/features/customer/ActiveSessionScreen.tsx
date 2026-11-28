import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  calculateBill,
  DEMO_CUSTOMER_ID,
  formatMoney,
  getVenue,
  unusedPrepaidMinutes,
} from '@/core';
import { useAppStore } from '@/core/useAppStore';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  space,
  StatTile,
  styles,
  useResponsive,
} from '@/components/ui';
import { activeSessionMessages, MODE_KEYS } from './activeSessionMessages';
import { CartPanel } from './cart/CartPanel';
import { MenuList } from './cart/MenuList';
import { OrderHistory } from './cart/OrderHistory';
import { useT } from '../../i18n/useLanguage';
import { FocusTimer } from './focus/FocusTimer';
import { blockWhenOffline } from './network/networkModel';
import { OfflineBanner } from './network/OfflineBanner';
import { useOnlineStatus } from './network/useOnlineStatus';
import { finishSession } from './shared/finishSession';
import { SessionStatusBanner } from './support/SessionStatusBanner';
import { SupportPanel } from './support/SupportPanel';
import { VenueInfoCard } from './support/VenueInfoCard';

export function ActiveSessionScreen() {
  const { t, lang } = useT(activeSessionMessages);
  const { isWide } = useResponsive();
  const venueId = useAppStore((state) => state.venueId);
  const session = useAppStore((state) =>
    state.sessions.find(
      (entry) =>
        entry.venueId === state.venueId &&
        entry.customerId === DEMO_CUSTOMER_ID,
    ),
  );
  const online = useOnlineStatus();
  const blocked = blockWhenOffline(online, lang);
  const venue = getVenue(venueId);
  // F248: ending a prepaid bundle early asks for confirmation first.
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  if (!session)
    return (
      <Screen>
        <ScreenHeader
          overline={t('overline')}
          accentColor={venue.accent}
          title={t('nextSession')}
        />
        <EmptyState message={t('noSession', { venue: venue.name })}>
          <Button
            variant="primary"
            fullWidth={!isWide}
            label={t('exploreSeats')}
            onPress={() => router.replace('/customer/explore')}
          />
        </EmptyState>
      </Screen>
    );
  const bill = calculateBill(session);
  const unused = unusedPrepaidMinutes(session);
  const end = () => {
    if (finishSession(session).ok) router.replace('/customer/receipt');
  };
  const rawSeatLabel =
    venue.seats.find((seat) => seat.id === session.seatId)?.label ?? '';
  // Core keeps "Seat 3"; only the Vietnamese rendering becomes "Chỗ 3".
  const seatLabel =
    lang === 'vi' ? rawSeatLabel.replace('Seat', 'Chỗ') : rawSeatLabel;
  return (
    <Screen>
      <OfflineBanner online={online} />

      <ScreenHeader
        overline={t('overline')}
        accentColor={venue.accent}
        title={t('liveTab')}
        subtitle={t('header', {
          venue: venue.name,
          seat: seatLabel,
          minutes: session.elapsedMinutes,
          mode: t(MODE_KEYS[session.mode]),
        })}
        trailing={
          <Badge
            label={t('badge', {
              seat: seatLabel,
              minutes: session.elapsedMinutes,
            })}
            tone="info"
          />
        }
      />

      <SessionStatusBanner session={session} />

      <View style={styles.grid}>
        <StatTile
          label={t('statSeat')}
          value={formatMoney(bill.time)}
          sublabel={t('statSeatSub', { minutes: session.elapsedMinutes })}
        />
        <StatTile
          label={t('statMenu')}
          value={formatMoney(bill.items)}
          sublabel={t('statMenuSub', { n: session.orders.length })}
        />
        <StatTile
          label={t('statTotal')}
          value={formatMoney(bill.total)}
          sublabel={t('statTotalSub')}
          accentColor={venue.accent}
        />
      </View>

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: space.lg,
          alignItems: 'stretch',
        }}
      >
        <View style={isWide ? { flex: 1 } : undefined}>
          <MenuList venueId={venue.id} />
        </View>
        <View style={isWide ? { flex: 1 } : undefined}>
          <CartPanel session={session} disabledReason={blocked} />
        </View>
      </View>

      <OrderHistory session={session} disabledReason={blocked} />

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          gap: space.lg,
          alignItems: 'stretch',
        }}
      >
        <View style={isWide ? { flex: 1 } : undefined}>
          <FocusTimer venueId={venue.id} />
        </View>
        <View style={isWide ? { flex: 1.2 } : undefined}>
          <SupportPanel
            context={{
              venueId: venue.id,
              seatId: session.seatId,
              sessionId: session.id,
              minute: session.elapsedMinutes,
            }}
          />
        </View>
      </View>

      <VenueInfoCard venueId={venue.id} />

      <Card variant="accent">
        <Text style={styles.textStrong}>
          {t('summary', {
            count: session.orders.length,
            time: formatMoney(bill.time),
            menu: formatMoney(bill.items),
          })}
        </Text>
        <Heading>{formatMoney(bill.total)}</Heading>
        <Text style={styles.caption}>{t('disclaimer')}</Text>
        {confirmingEnd && unused > 0 ? (
          <>
            <Banner tone="warning" role="alert">
              {t('earlyEnd', { minutes: unused })}
            </Banner>
            <View style={styles.row}>
              <Button
                variant="danger"
                fullWidth={!isWide}
                label={t('endAnyway')}
                disabled={blocked !== null}
                onPress={end}
              />
              <Button
                fullWidth={!isWide}
                label={t('keepSeat')}
                onPress={() => setConfirmingEnd(false)}
              />
            </View>
          </>
        ) : (
          <View style={styles.row}>
            <Button
              variant="danger"
              fullWidth={!isWide}
              label={t('endSession')}
              disabled={blocked !== null}
              onPress={() => (unused > 0 ? setConfirmingEnd(true) : end())}
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}
