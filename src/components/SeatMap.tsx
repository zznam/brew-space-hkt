import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney, type Seat, type Session, type Venue } from '@/core';
import { seatLabelText } from '@/i18n/seatLabel';
import { useT } from '@/i18n/useLanguage';
import { CafeScene3D } from './canvas3d/CafeScene3D';
import { seatMapMessages } from './messages';
import {
  Badge,
  Button,
  colors,
  radius,
  styles,
  useResponsive,
  space,
  motion,
} from './ui';

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
  const { t, lang } = useT(seatMapMessages);
  const [show3D, setShow3D] = useState(true);
  const { isWide } = useResponsive();
  const occupiedCount = venue.seats.filter((seat) =>
    sessions.some((s) => s.venueId === venue.id && s.seatId === seat.id),
  ).length;
  const freeCount = venue.seats.length - occupiedCount;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.rowBetween}>
        <View style={{ gap: space.xs, flex: 1 }}>
          <Text style={styles.subheading}>
            {show3D ? t('titleWith3D') : t('titleListOnly')}
          </Text>
          <View style={styles.row}>
            <Badge
              label={t('availableCount', { n: freeCount })}
              tone="success"
            />
            <Badge
              label={t('occupiedCount', { n: occupiedCount })}
              tone="info"
            />
          </View>
        </View>
        <Button
          size="sm"
          variant="ghost"
          label={show3D ? t('hide3D') : t('show3D')}
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
          gap: space.sm,
        }}
      >
        {venue.seats.map((seat: Seat) => {
          const occupied = sessions.some(
            (session) =>
              session.venueId === venue.id && session.seatId === seat.id,
          );
          const selected = selectedSeatId === seat.id;
          const status = occupied ? t('occupied') : t('available');
          return (
            <Pressable
              key={seat.id}
              accessibilityRole="button"
              accessibilityLabel={t('seatA11y', {
                seat: seatLabelText(seat.label, lang),
                kind: t(seat.kind),
                status,
                rate: formatMoney(seat.hourlyRate),
              })}
              accessibilityState={{ selected }}
              onPress={() => onSelect(seat.id)}
              style={({ pressed }) => ({
                width: isWide ? 185 : '100%',
                maxWidth: '100%',
                flexGrow: isWide ? 1 : 0,
                minHeight: 56,
                paddingHorizontal: space.md,
                paddingVertical: space.md,
                gap: space.xs,
                borderWidth: 2,
                borderColor: selected ? venue.accent : 'transparent',
                backgroundColor: selected
                  ? colors.surface
                  : occupied
                    ? colors.blueSurface
                    : colors.greenSurface,
                borderRadius: radius.lg,
                opacity: pressed ? motion.pressedOpacity : 1,
              })}
            >
              <View style={styles.rowBetween}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                  }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: radius.pill,
                      backgroundColor: occupied ? colors.blue : colors.green,
                    }}
                  />
                  <Text style={styles.textStrong}>
                    {seatLabelText(seat.label, lang)}
                  </Text>
                  <Text style={styles.caption}>· {t(seat.kind)}</Text>
                </View>

                <Text
                  style={[
                    styles.captionStrong,
                    { color: occupied ? colors.blue : colors.green },
                  ]}
                >
                  {status} ·{' '}
                  {t('perHour', { rate: formatMoney(seat.hourlyRate) })}
                </Text>
              </View>

              {seat.zone ? (
                <Text style={styles.caption} numberOfLines={1}>
                  {t('zoneGrid', { zone: seat.zone, x: seat.x, z: seat.z })}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
