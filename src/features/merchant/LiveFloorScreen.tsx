import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { calculateBill, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { merchantMessages, MODE_KEYS } from './messages';
import {
  Badge,
  Button,
  Card,
  colors,
  EmptyState,
  Heading,
  Screen,
  ScreenHeader,
  space,
  StatTile,
  styles,
  useResponsive,
} from '@/components/ui';

export function LiveFloorScreen() {
  const venueId = useAppStore((state) => state.venueId);
  const allSessions = useAppStore((state) => state.sessions);
  const selectedSeatId = useAppStore((state) => state.selectedSeatId);
  const selectSeat = useAppStore((state) => state.selectSeat);
  const { isWide } = useResponsive();
  const { t, lang } = useT(merchantMessages);
  const venue = getVenue(venueId);
  // Stable identity: the 3D viewer rebuilds its scene when `sessions` changes.
  const sessions = useMemo(
    () => allSessions.filter((session) => session.venueId === venue.id),
    [allSessions, venue.id],
  );
  const selectedSeat = venue.seats.find((seat) => seat.id === selectedSeatId);
  const liveRevenue = sessions.reduce(
    (sum, session) => sum + calculateBill(session).total,
    0,
  );
  const freeSeats = venue.seats.length - sessions.length;

  return (
    <Screen>
      <ScreenHeader
        overline={t('floorOverline')}
        accentColor={venue.accent}
        title={venue.name}
        subtitle={t('floorSubtitle', {
          occupied: sessions.length,
          total: venue.seats.length,
          description: venue.description,
        })}
      />

      <View style={styles.grid}>
        <StatTile
          label={t('statActive')}
          value={`${sessions.length}`}
          sublabel={t('statActiveSub', { total: venue.seats.length })}
          accentColor={venue.accent}
        />
        <StatTile
          label={t('statAvailable')}
          value={`${freeSeats}`}
          sublabel={t('statAvailableSub')}
          accentColor={colors.green}
        />
        <StatTile
          label={t('statTabs')}
          value={formatMoney(liveRevenue)}
          sublabel={t('statTabsSub')}
        />
      </View>

      <Card>
        <SeatMap
          venue={venue}
          sessions={sessions}
          selectedSeatId={selectedSeatId}
          onSelect={selectSeat}
        />

        {selectedSeat && (
          <View style={styles.row}>
            <Button
              label={t('sellTo', {
                seat: seatLabelText(selectedSeat.label, lang),
              })}
              variant="primary"
              fullWidth={!isWide}
              onPress={() =>
                router.push({
                  pathname: '/merchant/pos',
                  params: { seatId: selectedSeat.id },
                })
              }
            />
          </View>
        )}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Heading level={2}>{t('liveTabs')}</Heading>
          <Badge
            label={t('activeCount', { n: sessions.length })}
            tone="neutral"
          />
        </View>

        {sessions.length === 0 && <EmptyState message={t('noSessions')} />}

        {sessions.map((session) => {
          const seat = venue.seats.find((s) => s.id === session.seatId);
          const isSelected = selectedSeatId === session.seatId;
          const total = calculateBill(session).total;
          return (
            <View
              key={session.id}
              style={[
                styles.inset,
                styles.insetRow,
                isSelected && { backgroundColor: colors.greenSurface },
              ]}
            >
              <View style={{ gap: space.xxs, flex: 1 }}>
                <Text style={styles.textStrong}>
                  {t('tabLine', {
                    seat: seatLabelText(seat?.label ?? '', lang),
                    minutes: session.elapsedMinutes,
                    total: formatMoney(total),
                  })}
                  {isSelected ? t('tabLineSelected') : ''}
                </Text>
                <Text style={styles.caption}>
                  {t('tabMeta', {
                    mode: t(MODE_KEYS[session.mode]),
                    n: session.orders.length,
                  })}
                </Text>
              </View>
              {seat ? (
                <Button
                  size="sm"
                  variant={isSelected ? 'secondary' : 'default'}
                  label={isSelected ? t('selected') : t('selectSeat')}
                  onPress={() => selectSeat(seat.id)}
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
