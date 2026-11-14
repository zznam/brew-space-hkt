import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney, type Seat, type Session, type Venue } from '@/core';
import { CafeScene3D } from './canvas3d/CafeScene3D';
import { Button, styles } from './ui';

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
  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: '700' }}>
          {show3D
            ? '3D Environment + Accessible Seat Directory'
            : 'Accessible Seat Directory (3D hidden)'}
        </Text>
        <Button
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
      <View style={styles.row}>
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
              style={{
                width: 145,
                padding: 18,
                gap: 8,
                borderWidth: 2,
                borderColor: selected ? venue.accent : '#dce2da',
                backgroundColor: occupied ? '#edf1f5' : '#f0f7ee',
                borderRadius: 14,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 18 }}>
                {seat.label}
              </Text>
              <Text>
                {seat.kind} · {seat.x},{seat.z}
              </Text>
              <Text>{occupied ? 'Occupied' : 'Available'}</Text>
              <Text>{formatMoney(seat.hourlyRate)}/h</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
