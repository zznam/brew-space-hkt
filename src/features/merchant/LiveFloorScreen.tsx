import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { calculateBill, formatMoney, getVenue } from '@/core';
import { useAppStore } from '@/core/useAppStore';
import { SeatMap } from '@/components/SeatMap';
import {
  Badge,
  Button,
  Card,
  colors,
  Divider,
  Eyebrow,
  Heading,
  StatTile,
  styles,
} from '@/components/ui';
import { MerchantNav } from './MerchantNav';

export function LiveFloorScreen() {
  const store = useAppStore((state) => state);
  const venue = getVenue(store.venueId);
  const sessions = store.sessions.filter(
    (session) => session.venueId === venue.id,
  );
  const selectedSeat = venue.seats.find(
    (seat) => seat.id === store.selectedSeatId,
  );
  const liveRevenue = sessions.reduce(
    (sum, session) => sum + calculateBill(session).total,
    0,
  );
  const freeSeats = venue.seats.length - sessions.length;

  return (
    <>
      <MerchantNav current="live-floor" />

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ gap: 4 }}>
            <Eyebrow color={venue.accent}>MERCHANT / LIVE FLOOR</Eyebrow>
            <Heading>{venue.name}</Heading>
          </View>
          <Badge
            label={`${sessions.length} of ${venue.seats.length} seats occupied`}
            tone={sessions.length > 0 ? 'info' : 'neutral'}
          />
        </View>

        <Text style={styles.text}>
          {sessions.length} of {venue.seats.length} seats occupied ·{' '}
          {venue.description}
        </Text>

        <View style={styles.grid}>
          <StatTile
            label="Active Sessions"
            value={`${sessions.length}`}
            sublabel={`of ${venue.seats.length} total seats`}
            accentColor={venue.accent}
          />
          <StatTile
            label="Available Seats"
            value={`${freeSeats}`}
            sublabel="Ready for check-in"
            accentColor={colors.green}
          />
          <StatTile
            label="Open Tab Estimate"
            value={formatMoney(liveRevenue)}
            sublabel="Accrued seat + menu"
          />
        </View>

        {selectedSeat && (
          <View style={styles.row}>
            <Button
              label={`Sell to ${selectedSeat.label}`}
              selected
              onPress={() =>
                router.push({
                  pathname: '/merchant/pos',
                  params: { seatId: selectedSeat.id },
                })
              }
            />
          </View>
        )}

        <Divider />

        <SeatMap
          venue={venue}
          sessions={sessions}
          selectedSeatId={store.selectedSeatId}
          onSelect={store.selectSeat}
        />
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Heading>Live tabs</Heading>
          <Badge label={`${sessions.length} active`} tone="neutral" />
        </View>

        {sessions.length === 0 && (
          <Card variant="subtle">
            <Text style={styles.text}>
              No active sessions. Switch to Customer to start one.
            </Text>
          </Card>
        )}

        {sessions.map((session) => {
          const seat = venue.seats.find((s) => s.id === session.seatId);
          const isSelected = store.selectedSeatId === session.seatId;
          const total = calculateBill(session).total;
          return (
            <View
              key={session.id}
              style={[
                styles.rowBetween,
                {
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isSelected ? venue.accent : colors.border,
                  backgroundColor: isSelected
                    ? colors.greenSurface
                    : colors.surfaceSubtle,
                },
              ]}
            >
              <View style={{ gap: 2 }}>
                <Text
                  style={[
                    styles.text,
                    { color: colors.ink, fontWeight: '700' },
                  ]}
                >
                  {seat?.label} · {session.elapsedMinutes} min ·{' '}
                  {formatMoney(total)}
                  {isSelected ? ' · Selected' : ''}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Mode: {session.mode} · {session.orders.length} order line(s)
                </Text>
              </View>
              {seat ? (
                <Button
                  size="sm"
                  label={isSelected ? 'Selected' : 'Select seat'}
                  selected={isSelected}
                  onPress={() => store.selectSeat(seat.id)}
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    </>
  );
}
