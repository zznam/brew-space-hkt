import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney, type Seat, type Session, type Venue } from '@/core';
import { CafeScene3D } from './canvas3d/CafeScene3D';
import { Badge, Button, colors, styles } from './ui';

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
  const occupiedCount = venue.seats.filter((seat) =>
    sessions.some((s) => s.venueId === venue.id && s.seatId === seat.id),
  ).length;
  const freeCount = venue.seats.length - occupiedCount;

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ gap: 4 }}>
          <Text style={styles.subheading}>
            {show3D
              ? '3D Environment + Accessible Seat Directory'
              : 'Accessible Seat Directory (3D hidden)'}
          </Text>
          <View style={styles.row}>
            <Badge label={`${freeCount} Available`} tone="success" />
            <Badge label={`${occupiedCount} Occupied`} tone="info" />
            {selectedSeatId ? (
              <Badge
                label={`Selected: ${venue.seats.find((s) => s.id === selectedSeatId)?.label ?? selectedSeatId}`}
                tone="warning"
              />
            ) : null}
          </View>
        </View>
        <Button
          size="sm"
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

      <View style={styles.grid}>
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
                width: 168,
                padding: 16,
                gap: 8,
                borderWidth: selected ? 2.5 : 1.5,
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
                borderRadius: 16,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <View style={styles.rowBetween}>
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 17,
                    color: colors.ink,
                  }}
                >
                  {seat.label}
                </Text>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: occupied ? colors.blue : colors.green,
                  }}
                />
              </View>

              <Text
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  fontWeight: '600',
                }}
              >
                {seat.kind} · {seat.x},{seat.z}
              </Text>

              {seat.zone ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.subtle,
                    fontWeight: '600',
                  }}
                  numberOfLines={1}
                >
                  {seat.zone}
                </Text>
              ) : null}

              <View
                style={[
                  styles.rowBetween,
                  {
                    paddingTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: occupied
                      ? colors.blueBorder
                      : colors.greenBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: occupied ? colors.blue : colors.green,
                  }}
                >
                  {occupied ? 'Occupied' : 'Available'}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.ink,
                  }}
                >
                  {formatMoney(seat.hourlyRate)}/h
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
