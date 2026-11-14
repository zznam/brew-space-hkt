import { router } from 'expo-router';
import { Text } from 'react-native';
import { calculateBill, DEMO_CUSTOMER_ID, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { Button, Card, Heading, styles } from '@/components/ui';
import { activeSessionMessages, MODE_KEYS } from './activeSessionMessages';
import { CartPanel } from './cart/CartPanel';
import { MenuList } from './cart/MenuList';
import { OrderHistory } from './cart/OrderHistory';
import { useT } from './i18n/useLanguage';
import { CustomerNav } from './shared/CustomerNav';
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
  const store = useAppStore((state) => state);
  const online = useOnlineStatus();
  const blocked = blockWhenOffline(online, lang);
  const venue = getVenue(store.venueId);
  const session = store.sessions.find(
    (entry) =>
      entry.venueId === venue.id && entry.customerId === DEMO_CUSTOMER_ID,
  );
  if (!session)
    return (
      <Card>
        <CustomerNav current="session" />
        <Heading>{t('nextSession')}</Heading>
        <Text style={styles.text}>{t('noSession', { venue: venue.name })}</Text>
        <Button
          label={t('exploreSeats')}
          onPress={() => router.replace('/customer/explore')}
        />
      </Card>
    );
  const bill = calculateBill(session);
  const rawSeatLabel =
    venue.seats.find((seat) => seat.id === session.seatId)?.label ?? '';
  // Core keeps "Seat 3"; only the Vietnamese rendering becomes "Chỗ 3".
  const seatLabel =
    lang === 'vi' ? rawSeatLabel.replace('Seat', 'Chỗ') : rawSeatLabel;
  return (
    <Card>
      <CustomerNav current="session" />
      <OfflineBanner online={online} />
      <Heading>{t('liveTab')}</Heading>
      <Text style={styles.text}>
        {t('header', {
          venue: venue.name,
          seat: seatLabel,
          minutes: session.elapsedMinutes,
          mode: t(MODE_KEYS[session.mode]),
        })}
      </Text>
      <SessionStatusBanner session={session} />
      <MenuList venueId={venue.id} />
      <CartPanel session={session} disabledReason={blocked} />
      <OrderHistory session={session} disabledReason={blocked} />
      <FocusTimer venueId={venue.id} />
      <SupportPanel
        context={{
          venueId: venue.id,
          seatId: session.seatId,
          sessionId: session.id,
          minute: session.elapsedMinutes,
        }}
      />
      <VenueInfoCard venueId={venue.id} />
      <Text style={styles.text}>
        {t('summary', {
          count: session.orders.length,
          time: formatMoney(bill.time),
          menu: formatMoney(bill.items),
        })}
      </Text>
      <Heading>{formatMoney(bill.total)}</Heading>
      <Text style={styles.text}>{t('disclaimer')}</Text>
      <Button
        label={t('endSession')}
        disabled={blocked !== null}
        onPress={() => {
          if (finishSession(session).ok) router.replace('/customer/receipt');
        }}
      />
    </Card>
  );
}
