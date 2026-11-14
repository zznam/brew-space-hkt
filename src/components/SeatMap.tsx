import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney, type Seat, type Session, type Venue } from '@/core';
import { CafeScene3D } from './canvas3d/CafeScene3D';
import { Badge, Button, colors, styles, useResponsive } from './ui';

/** Shared accessible baseline + interactive 3D cafe renderer behind the same props. */
export interface SeatMapProps {
  venue: Venue;
  sessions: Session[];
  selectedSeatId: string | null;
  onSelect: (id: string) => void;
}

export function SeatMap({
  venue,
  sessions,
  selectedSeatId,
  onSelect,
}: SeatMapProps) {
  const [show3D, setShow3D] = useState(true);
  const { isWide } = useResponsive();
  const occupiedCount = venue.seats.filter((seat) =>
    sessions.some((s) => s.venueId === venue.id && s.seatId === seat.id),
  ).length;
  const freeCount = venue.seats.length - occupiedCount;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={styles.subheading}>
            {show3D ? '3D Floor & Seat List' : 'Seat List (3D hidden)'}
          </Text>
          <View style={styles.row}>
            <Badge label={`${freeCount} Available`} tone="success" />
            <Badge label={`${occupiedCount} Occupied`} tone="info" />
          </View>
        </View>
        <Button
          size="sm"
          variant="ghost"
          label={show3D ? 'Hide 3D View' : 'Show 3D View'}
          onPress={() => setShow3D((prev) => !prev)}
        />
      </View>

      {show3D ? (
        <CafeScene3D
          venue={venue}
          sessions={sessions}
          selectedSeatId={selectedSeatId}
          onSelect={onSelect}
        />
      ) : null}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          flexWrap: isWide ? 'wrap' : 'nowrap',
          gap: 8,
        }}
      >
        {venue.seats.map((seat: Seat) => {
          const occupied = sessions.some(
            (session) =>
              session.venueId === venue.id && session.seatId === seat.id,
          );
          const selected = selectedSeatId === seat.id;
          return (
            <Pressable
              key={seat.id}
              accessibilityRole="button"
              accessibilityLabel={`${seat.label}, ${seat.kind}, ${occupied ? 'Occupied' : 'Available'}, ${formatMoney(seat.hourlyRate)} per hour`}
              accessibilityState={{ selected }}
              onPress={() => onSelect(seat.id)}
              style={({ pressed }) => ({
                width: isWide ? 185 : '100%',
                maxWidth: '100%',
                flexGrow: isWide ? 1 : 0,
                minHeight: 54,
                paddingHorizontal: 14,
                paddingVertical: 12,
                gap: 6,
                borderWidth: selected ? 2 : 1,
                borderColor: selected
                  ? venue.accent
                  : occupied
                    ? colors.blueBorder
                    : colors.greenBorder,
                backgroundColor: selected
                  ? colors.surface
                  : occupied
                    ? colors.blueSurface
                    : colors.greenSurface,
                borderRadius: 14,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <View style={styles.rowBetween}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: occupied ? colors.blue : colors.green,
                    }}
                  />
                  <Text
                    style={{
                      fontWeight: '800',
                      fontSize: 16,
                      color: colors.ink,
                    }}
                  >
                    {seat.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.muted,
                      fontWeight: '600',
                    }}
                  >
                    · {seat.kind}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: occupied ? colors.blue : colors.green,
                  }}
                >
                  {occupied ? 'Occupied' : 'Available'} ·{' '}
                  {formatMoney(seat.hourlyRate)}/h
                </Text>
              </View>

              {seat.zone ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.subtle,
                    fontWeight: '600',
                  }}
                  numberOfLines={1}
                >
                  {seat.zone} · Grid ({seat.x},{seat.z})
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
